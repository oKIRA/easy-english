export type UserRole = 'admin' | 'teacher' | 'student';
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface User {
  uid: string;
  name: string;
  email: string;
  photoURL?: string | null;
  role: UserRole;
  status: UserStatus;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  activeTeacherId?: string;
}

export interface BookingSettings {
  slotDurationMinutes: number;
  advanceNoticeHours: number;
  cancellationNoticeHours: number;
  maxAdvanceDays: number;
}

export interface TeacherProfile {
  teacherId: string;
  bio: string;
  specialties: string[];
  languages: string[];
  timezone: string;
  bookingSettings: BookingSettings;
  isAcceptingStudents: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  studentId: string;
  englishLevel?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Beginner' | 'Intermediate' | 'Advanced';
  learningGoals?: string[];
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface TeacherStudentRelationship {
  id: string;
  studentId: string;
  teacherId: string;
  status: 'active' | 'ended';
  assignedBy: string;
  assignedAt: string;
  endedAt?: string | null;
  endedBy?: string | null;
  endReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  status: 'draft' | 'published' | 'archived';
  visibility: 'enrolled_only' | 'all_my_students' | 'public';
  coverAssetId?: string | null;
  level: string;
  modulesCount?: number;
  lessonsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  moduleId: string;
  teacherId: string;
  title: string;
  description: string;
  contentType: 'video' | 'text' | 'interactive' | 'material';
  order: number;
  status: 'draft' | 'published' | 'archived';
  visibility: string;
  estimatedDuration: number; // in minutes
  contentText?: string;
  videoUrl?: string;
  videoDuration?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LearningAsset {
  id: string;
  title: string;
  description?: string;
  teacherId: string;
  courseId?: string | null;
  lessonId?: string | null;
  assetType: 'pdf' | 'doc' | 'sheet' | 'audio' | 'video' | 'link' | 'slides';
  storagePath?: string | null;
  externalUrl?: string | null;
  mimeType: string;
  sizeBytes: number;
  visibility: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  type: 'multiple_choice' | 'open_text' | 'true_false';
  options?: string[];
  correctAnswer?: string;
  points: number;
}

export interface Assessment {
  id: string;
  teacherId: string;
  courseId?: string | null;
  lessonId?: string | null;
  title: string;
  description: string;
  assessmentType: 'quiz' | 'essay' | 'speaking' | 'reading';
  maxScore: number;
  passingScore?: number;
  questions?: AssessmentQuestion[];
  status: 'draft' | 'published' | 'archived';
  dueAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentResult {
  id: string;
  assessmentId: string;
  studentId: string;
  teacherId: string;
  score: number;
  maxScore?: number;
  feedback?: string;
  answers?: Record<string, string>;
  status: 'pending' | 'submitted' | 'graded';
  gradedBy?: string | null;
  gradedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilitySlot {
  id: string;
  teacherId: string;
  startAt: string; // ISO 8601
  endAt: string;   // ISO 8601
  dayOfWeek?: number; // 0=Sunday, 1=Monday...
  timezone: string;
  status: 'available' | 'booked' | 'blocked';
  recurrenceGroupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  studentId: string;
  teacherId: string;
  relationshipId: string;
  startAt: string;
  endAt: string;
  timezone: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'failed';
  zoomMeetingId?: string | null;
  zoomJoinUrl?: string | null;
  zoomStartUrl?: string | null;
  calendarSyncStatus: 'synced' | 'pending' | 'failed' | 'not_connected';
  notes?: string;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationConnection {
  id: string;
  userId: string;
  provider: 'google_calendar' | 'zoom';
  status: 'connected' | 'disconnected';
  scopes: string[];
  externalAccountId?: string;
  connectedAt?: string;
  updatedAt: string;
  disconnectedAt?: string | null;
}

export interface MediaAsset {
  id: string;
  ownerId: string;
  teacherId: string;
  title: string;
  description?: string;
  storagePath: string;
  downloadUrl?: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number;
  status: 'active' | 'processing' | 'expired' | 'deleted';
  visibility: string;
  expiresAt?: string | null;
  quotaReservationId?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface StorageQuota {
  id: string;
  scopeType: 'global' | 'teacher';
  scopeId: string; // 'global' or teacherId
  limitBytes: number;
  usedBytes: number;
  reservedBytes: number;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'booking_created' | 'booking_cancelled' | 'new_grade' | 'new_material' | 'assignment_due' | 'system';
  title: string;
  message: string;
  relatedEntityId?: string;
  readAt?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId: string;
  targetUserId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
