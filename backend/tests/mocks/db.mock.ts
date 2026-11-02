export const mockUsers = {
  student1: {
    id: '10000000-0000-4000-8000-000000000001',
    email: 'student1@example.com',
    name: 'Student One',
    role: 'student' as const,
    password_hash: '$2b$12$e7rA57c6O7mX0o3x0qG4Qe9mK3xJqH/y6A0JjKxQ8o1Zp4r7.4u2m', // hash of 'secret123'
    student_id: 'a0000000-0000-4000-8000-000000000001',
  },
  student2: {
    id: '20000000-0000-4000-8000-000000000002',
    email: 'student2@example.com',
    name: 'Student Two',
    role: 'student' as const,
    password_hash: '$2b$12$e7rA57c6O7mX0o3x0qG4Qe9mK3xJqH/y6A0JjKxQ8o1Zp4r7.4u2m',
    student_id: 'b0000000-0000-4000-8000-000000000002',
  },
  faculty1: {
    id: '30000000-0000-4000-8000-000000000003',
    email: 'faculty1@neurolearn.ai',
    name: 'Dr. Rao',
    role: 'faculty' as const,
    password_hash: '$2b$12$e7rA57c6O7mX0o3x0qG4Qe9mK3xJqH/y6A0JjKxQ8o1Zp4r7.4u2m',
    student_id: null,
  },
  faculty2: {
    id: '40000000-0000-4000-8000-000000000004',
    email: 'otherfaculty@neurolearn.ai',
    name: 'Prof. Other',
    role: 'faculty' as const,
    password_hash: '$2b$12$e7rA57c6O7mX0o3x0qG4Qe9mK3xJqH/y6A0JjKxQ8o1Zp4r7.4u2m',
    student_id: null,
  },
};

export const mockCohort = {
  id: 'c0000000-0000-4000-8000-000000000001',
  name: 'Cohort A',
  faculty_id: mockUsers.faculty1.id,
};
