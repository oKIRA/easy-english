import {
  collection,
  doc,
  deleteField,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  writeBatch,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '../infrastructure/firebase/firebase';
import type { UserRole } from '../shared/types';

const BATCH_LIMIT = 450;

async function addMatchingDocuments(
  references: Map<string, DocumentReference>,
  collectionName: string,
  field: string,
  userId: string
): Promise<void> {
  const snapshot = await getDocs(
    query(collection(db, collectionName), where(field, '==', userId))
  );
  snapshot.docs.forEach((document) => references.set(document.ref.path, document.ref));
}

export async function resetUserProfileData(userId: string, role: UserRole): Promise<number> {
  const references = new Map<string, DocumentReference>();
  const assignedStudentIds = new Set<string>();

  for (const collectionName of ['studentProfiles', 'teacherProfiles']) {
    const reference = doc(db, collectionName, userId);
    if ((await getDoc(reference)).exists()) references.set(reference.path, reference);
  }
  const quotaReference = doc(db, 'storageQuotas', userId);
  if ((await getDoc(quotaReference)).exists()) {
    references.set(quotaReference.path, quotaReference);
  }

  const userOwnedCollections = [
    ['teacherStudentRelationships', 'studentId'],
    ['teacherStudentRelationships', 'teacherId'],
    ['assessmentResults', 'studentId'],
    ['assessmentResults', 'teacherId'],
    ['bookings', 'studentId'],
    ['bookings', 'teacherId'],
    ['integrationConnections', 'userId'],
    ['calendarEvents', 'userId'],
    ['notifications', 'userId'],
  ] as const;

  for (const [collectionName, field] of userOwnedCollections) {
    await addMatchingDocuments(references, collectionName, field, userId);
  }

  if (role === 'teacher' || role === 'admin') {
    const relationships = await getDocs(
      query(collection(db, 'teacherStudentRelationships'), where('teacherId', '==', userId))
    );
    relationships.docs.forEach((relationship) => {
      if (relationship.data().status === 'active') assignedStudentIds.add(relationship.data().studentId);
    });

    const courses = await getDocs(
      query(collection(db, 'courses'), where('teacherId', '==', userId))
    );
    courses.docs.forEach((course) => references.set(course.ref.path, course.ref));

    const teacherOwnedCollections = [
      ['assessments', 'teacherId'],
      ['availabilitySlots', 'teacherId'],
      ['learningAssets', 'teacherId'],
      ['mediaAssets', 'teacherId'],
      ['mediaAssets', 'ownerId'],
    ] as const;

    for (const [collectionName, field] of teacherOwnedCollections) {
      await addMatchingDocuments(references, collectionName, field, userId);
    }

    for (const course of courses.docs) {
      for (const collectionName of ['modules', 'lessons', 'learningAssets']) {
        await addMatchingDocuments(references, collectionName, 'courseId', course.id);
      }
    }
  }

  const studentIdsToUnassign = new Set<string>();
  if (role === 'student') {
    studentIdsToUnassign.add(userId);
  } else {
    const assignedIds = Array.from(assignedStudentIds);
    for (let offset = 0; offset < assignedIds.length; offset += BATCH_LIMIT) {
      const studentSnapshots = await Promise.all(
        assignedIds.slice(offset, offset + BATCH_LIMIT)
          .map((studentId) => getDoc(doc(db, 'users', studentId)))
      );
      studentSnapshots.forEach((student) => {
        if (student.exists() && student.data().activeTeacherId === userId) {
          studentIdsToUnassign.add(student.id);
        }
      });
    }
  }
  const studentIds = Array.from(studentIdsToUnassign);
  for (let offset = 0; offset < studentIds.length; offset += BATCH_LIMIT) {
    const batch = writeBatch(db);
    studentIds.slice(offset, offset + BATCH_LIMIT).forEach((studentId) => {
      batch.update(doc(db, 'users', studentId), { activeTeacherId: deleteField() });
    });
    await batch.commit();
  }

  const documents = Array.from(references.values());
  documents.sort((left, right) => {
    const isCourse = (reference: DocumentReference) => reference.parent.id === 'courses';
    return Number(isCourse(left)) - Number(isCourse(right));
  });
  for (let offset = 0; offset < documents.length; offset += BATCH_LIMIT) {
    const batch = writeBatch(db);
    documents.slice(offset, offset + BATCH_LIMIT).forEach((reference) => batch.delete(reference));
    await batch.commit();
  }

  await updateDoc(doc(db, 'users', userId), {
    activeTeacherId: deleteField(),
    profileResetAt: new Date().toISOString(),
  });

  return documents.length;
}
