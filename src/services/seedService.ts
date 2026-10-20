import {
  collection,
  doc,
  setDoc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../infrastructure/firebase/firebase';
import { DEMO_USERS } from '../modules/auth/AuthContext';

export async function isDatabaseSeeded(): Promise<boolean> {
  try {
    const snap = await getDocs(collection(db, 'courses'));
    return !snap.empty;
  } catch {
    return false;
  }
}

export async function seedInitialDatabase(onProgress?: (step: string) => void): Promise<void> {
  onProgress?.('Criando perfis de usuários, administradores e professores...');

  const batch = writeBatch(db);

  // 1. Seed Users
  const users = [
    DEMO_USERS.admin,
    DEMO_USERS.teacher,
    DEMO_USERS.student,
    {
      uid: 'demo-student-02',
      name: 'Lucas Moreira (Disponível)',
      email: 'lucas.moreira@student.easyenglish.edu',
      role: 'student' as const,
      status: 'active' as const,
      timezone: 'America/Sao_Paulo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      uid: 'demo-student-03',
      name: 'Camila Lima (Aluna B2)',
      email: 'camila.lima@student.easyenglish.edu',
      role: 'student' as const,
      status: 'active' as const,
      timezone: 'America/Sao_Paulo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      uid: 'demo-teacher-02',
      name: 'Profa. Sarah Jenkins',
      email: 'sarah.jenkins@easyenglish.edu',
      role: 'teacher' as const,
      status: 'active' as const,
      timezone: 'America/Sao_Paulo',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const u of users) {
    batch.set(doc(db, 'users', u.uid), {
      ...u,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // 2. Teacher Profiles
  batch.set(doc(db, 'teacherProfiles', 'demo-teacher-01'), {
    teacherId: 'demo-teacher-01',
    bio: 'Certificado CELTA pela Universidade de Cambridge com 12 anos de experiência em Business English e preparação para exames internacionais (IELTS/TOEFL/FCE).',
    specialties: ['Business English', 'Cambridge Exams (FCE/CAE)', 'Pronunciation & Accent Reduction'],
    languages: ['Inglês (Nativo)', 'Português (Fluente)', 'Espanhol (Básico)'],
    timezone: 'America/Sao_Paulo',
    bookingSettings: {
      slotDurationMinutes: 45,
      advanceNoticeHours: 12,
      cancellationNoticeHours: 24,
      maxAdvanceDays: 30,
    },
    isAcceptingStudents: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 3. Student Profiles
  batch.set(doc(db, 'studentProfiles', 'demo-student-01'), {
    studentId: 'demo-student-01',
    englishLevel: 'B1',
    learningGoals: ['Fluência para reuniões executivas', 'Aumentar vocabulário corporativo', 'Certificação B2 First'],
    notes: 'Aluna muito dedicada. Foco atual em preposições e conectivos para apresentações profissionais.',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'studentProfiles', 'demo-student-02'), {
    studentId: 'demo-student-02',
    englishLevel: 'A2',
    learningGoals: ['Conversação básica para viagens', 'Superar timidez ao falar'],
    notes: 'Aguardando alocação de professor mentor.',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 4. Relationships (Mandatory collection)
  // Student 01 bound to Teacher 01
  batch.set(doc(db, 'teacherStudentRelationships', 'rel-01'), {
    id: 'rel-01',
    studentId: 'demo-student-01',
    teacherId: 'demo-teacher-01',
    status: 'active',
    assignedBy: 'demo-admin-01',
    assignedAt: new Date().toISOString(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 5. Courses
  const courseId = 'course-business-mastery';
  batch.set(doc(db, 'courses', courseId), {
    id: courseId,
    title: 'Business English Mastery & International Negotiations',
    description: 'Curso prático focado em comunicação corporativa de alto impacto, liderança de reuniões em inglês, negociações e e-mails executivos.',
    teacherId: 'demo-teacher-01',
    status: 'published',
    visibility: 'all_my_students',
    level: 'B1 - B2 Intermediate',
    coverAssetId: null,
    modulesCount: 2,
    lessonsCount: 4,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 6. Modules
  const mod1Id = 'mod-01-meetings';
  const mod2Id = 'mod-02-negotiations';
  batch.set(doc(db, 'modules', mod1Id), {
    id: mod1Id,
    courseId,
    title: 'Módulo 1: Leading Effective Meetings & Agendas',
    description: 'Vocabulário, conectivos e frases-chave para abrir, conduzir e concluir reuniões.',
    order: 1,
    status: 'published',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  batch.set(doc(db, 'modules', mod2Id), {
    id: mod2Id,
    courseId,
    title: 'Módulo 2: Polite Disagreements & Strategic Negotiations',
    description: 'Expressões idiomáticas diplomáticas para negociar prazos, orçamentos e acordos.',
    order: 2,
    status: 'published',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 7. Lessons
  const lesson1Id = 'lesson-01-openers';
  batch.set(doc(db, 'lessons', lesson1Id), {
    id: lesson1Id,
    courseId,
    moduleId: mod1Id,
    teacherId: 'demo-teacher-01',
    title: '1.1 Powerful Meeting Openers and Setting Objectives',
    description: 'Como capturar a atenção de clientes e colegas logo nos primeiros 3 minutos de videoconferência.',
    contentType: 'video',
    order: 1,
    status: 'published',
    visibility: 'all_my_students',
    estimatedDuration: 25,
    videoUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    contentText: `<h3>Frases-Chave para Abertura de Reuniões</h3>
<ul>
  <li>"Thank you everyone for joining on time. Today our core objective is to finalize the Q3 delivery schedule."</li>
  <li>"Before we dive in, let me quickly run through the agenda."</li>
  <li>"Could everyone please confirm they can hear me clearly and see my screen?"</li>
</ul>
<p><strong>Dica Profissional:</strong> Estabeleça o objetivo principal nos primeiros 60 segundos do início da reunião.</p>`,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const lesson2Id = 'lesson-02-agendas';
  batch.set(doc(db, 'lessons', lesson2Id), {
    id: lesson2Id,
    courseId,
    moduleId: mod1Id,
    teacherId: 'demo-teacher-01',
    title: '1.2 Managing Time and Polite Interventions',
    description: 'Técnicas verbais para retomar o foco quando a discussão desviar do tópico principal.',
    contentType: 'text',
    order: 2,
    status: 'published',
    visibility: 'all_my_students',
    estimatedDuration: 20,
    contentText: `<h3>Guia de Intervenções Diplomáticas</h3>
<p>Quando a reunião desviar do foco principal, utilize frases de transição polidas:</p>
<ul>
  <li>"I appreciate your point, John, but let's park that topic for the follow-up meeting."</li>
  <li>"To be mindful of everyone's time, let's circle back to item 2."</li>
  <li>"May I jump in for a quick clarification on those figures?"</li>
</ul>`,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 8. Learning Assets
  batch.set(doc(db, 'learningAssets', 'asset-01-pdf'), {
    id: 'asset-01-pdf',
    title: 'Executive Meeting Phrasebook (PDF Handout)',
    description: 'Guia de bolso com mais de 75 frases prontas para reuniões internacionais.',
    teacherId: 'demo-teacher-01',
    courseId,
    lessonId: lesson1Id,
    assetType: 'pdf',
    storagePath: 'assets/demo-teacher-01/executive_phrasebook.pdf',
    externalUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024 * 480, // 480 KB
    visibility: 'all_my_students',
    status: 'published',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 9. Assessments
  const assessmentId = 'eval-business-01';
  batch.set(doc(db, 'assessments', assessmentId), {
    id: assessmentId,
    teacherId: 'demo-teacher-01',
    courseId,
    lessonId: lesson1Id,
    title: 'Quiz Prático: Estruturas Diplomáticas e Condicionais em Reuniões',
    description: 'Avaliação de 4 questões para testar vocabulário profissional e uso de modais diplomáticos.',
    assessmentType: 'quiz',
    maxScore: 100,
    passingScore: 70,
    status: 'published',
    questions: [
      {
        id: 'q1',
        prompt: 'Qual é a forma mais diplomática e profissional de discordar em uma reunião?',
        type: 'multiple_choice',
        options: [
          'You are completely wrong about this estimate.',
          'I see where you are coming from, however I have some reservations regarding the timeframe.',
          'No way, that will never work.',
          'I do not like this idea at all.',
        ],
        correctAnswer: 'I see where you are coming from, however I have some reservations regarding the timeframe.',
        points: 25,
      },
      {
        id: 'q2',
        prompt: 'Qual expressão significa "adiar temporariamente um tópico para discutir mais tarde"?',
        type: 'multiple_choice',
        options: [
          'To throw under the bus',
          'To park an idea',
          'To burn bridges',
          'To cut corners',
        ],
        correctAnswer: 'To park an idea',
        points: 25,
      },
      {
        id: 'q3',
        prompt: 'Em uma negociação internacional, a frase "What if we were to meet in the middle?" expressa:',
        type: 'multiple_choice',
        options: [
          'Uma recusa formal de proposta',
          'Uma sugestão hipotética de concessão mútua',
          'Uma acusação de quebra de contrato',
          'Um encerramento abrupto da conversa',
        ],
        correctAnswer: 'Uma sugestão hipotética de concessão mútua',
        points: 25,
      },
      {
        id: 'q4',
        prompt: 'Qual modal verb expressa a sugestão mais polida para pedir uma extensão de prazo?',
        type: 'multiple_choice',
        options: [
          'Must you give us more time?',
          'Would it be possible to extend the deadline by two days?',
          'You should definitely give us more days.',
          'Can you hurry up?',
        ],
        correctAnswer: 'Would it be possible to extend the deadline by two days?',
        points: 25,
      },
    ],
    dueAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 10. Assessment Result (student 01 already completed)
  batch.set(doc(db, 'assessmentResults', 'result-01'), {
    id: 'result-01',
    assessmentId,
    studentId: 'demo-student-01',
    teacherId: 'demo-teacher-01',
    score: 100,
    feedback: 'Excelente domínio das formas diplomáticas em inglês corporativo! Parabéns, Beatriz!',
    status: 'graded',
    gradedBy: 'demo-teacher-01',
    gradedAt: new Date().toISOString(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 11. Availability Slots (Tomorrow & this week)
  const today = new Date();
  const times = [
    { hour: 9, label: '09:00' },
    { hour: 11, label: '11:00' },
    { hour: 14, label: '14:00' },
    { hour: 16, label: '16:00' },
  ];

  times.forEach((t, idx) => {
    const slotDate = new Date(today);
    slotDate.setDate(today.getDate() + 1); // tomorrow
    slotDate.setHours(t.hour, 0, 0, 0);

    const endSlot = new Date(slotDate);
    endSlot.setMinutes(45);

    const slotId = `slot-tomorrow-${idx}`;
    batch.set(doc(db, 'availabilitySlots', slotId), {
      id: slotId,
      teacherId: 'demo-teacher-01',
      startAt: slotDate.toISOString(),
      endAt: endSlot.toISOString(),
      timezone: 'America/Sao_Paulo',
      status: idx === 0 ? 'booked' : 'available',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  // 12. Bookings
  const bookingDate = new Date(today);
  bookingDate.setDate(today.getDate() + 1);
  bookingDate.setHours(9, 0, 0, 0);
  const bookingEndDate = new Date(bookingDate);
  bookingEndDate.setMinutes(45);

  batch.set(doc(db, 'bookings', 'booking-demo-01'), {
    id: 'booking-demo-01',
    studentId: 'demo-student-01',
    teacherId: 'demo-teacher-01',
    relationshipId: 'rel-01',
    startAt: bookingDate.toISOString(),
    endAt: bookingEndDate.toISOString(),
    timezone: 'America/Sao_Paulo',
    status: 'confirmed',
    zoomMeetingId: '984 5120 7841',
    zoomJoinUrl: 'https://zoom.us/j/98451207841?pwd=EasyEnglish2026',
    zoomStartUrl: 'https://zoom.us/s/98451207841',
    calendarSyncStatus: 'synced',
    notes: 'Prática de simulação de negociação com fornecedor externo.',
    idempotencyKey: 'idem-booking-01',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 13. Storage Quotas
  batch.set(doc(db, 'storageQuotas', 'global'), {
    id: 'global',
    scopeType: 'global',
    scopeId: 'global',
    limitBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    usedBytes: 1.84 * 1024 * 1024 * 1024, // 1.84 GB
    reservedBytes: 0.25 * 1024 * 1024 * 1024,
    updatedAt: new Date().toISOString(),
  });

  batch.set(doc(db, 'storageQuotas', 'demo-teacher-01'), {
    id: 'demo-teacher-01',
    scopeType: 'teacher',
    scopeId: 'demo-teacher-01',
    limitBytes: 2 * 1024 * 1024 * 1024, // 2 GB
    usedBytes: 680 * 1024 * 1024, // 680 MB
    reservedBytes: 0,
    updatedAt: new Date().toISOString(),
  });

  // 14. Media Assets (Videos with expiration and quota tracking)
  batch.set(doc(db, 'mediaAssets', 'media-01'), {
    id: 'media-01',
    ownerId: 'demo-teacher-01',
    teacherId: 'demo-teacher-01',
    title: 'Aula Gravada: Pitching and Value Proposition in English',
    description: 'Gravação da sessão prática de 45 minutos com simulação de elevator pitch.',
    storagePath: 'media/demo-teacher-01/pitching_masterclass_v1.mp4',
    downloadUrl: 'https://vjs.zencdn.net/v/oceans.mp4',
    mimeType: 'video/mp4',
    sizeBytes: 340 * 1024 * 1024, // 340 MB (within 500MB video cap)
    durationSeconds: 2700,
    status: 'active',
    visibility: 'all_my_students',
    expiresAt: new Date(Date.now() + 60 * 86400000).toISOString(), // 60 days
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 15. Notifications
  batch.set(doc(db, 'notifications', 'notif-01'), {
    id: 'notif-01',
    userId: 'demo-student-01',
    type: 'booking_created',
    title: 'Aula Confirmada com Prof. Michael Davies',
    message: 'Sua aula de Business English foi confirmada para amanhã às 09:00. Link do Zoom disponível na sua agenda.',
    relatedEntityId: 'booking-demo-01',
    readAt: null,
    createdAt: new Date().toISOString(),
  });

  // 16. Audit Logs
  batch.set(doc(db, 'auditLogs', 'audit-01'), {
    id: 'audit-01',
    actorId: 'demo-admin-01',
    actorName: 'Helena Rocha (Admin)',
    actorRole: 'admin',
    action: 'ASSIGN_STUDENT_TO_TEACHER',
    entityType: 'teacherStudentRelationships',
    entityId: 'rel-01',
    targetUserId: 'demo-student-01',
    metadata: {
      teacherId: 'demo-teacher-01',
      studentName: 'Beatriz Santos',
      reason: 'Vínculo pedagógico aprovado',
    },
    createdAt: new Date().toISOString(),
  });

  await batch.commit();
  onProgress?.('Banco de dados inicializado com sucesso!');
}
