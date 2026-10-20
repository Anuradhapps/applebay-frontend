export type Student = {
  id: number;
  studentNo: string;
  firstName: string;
  lastName: string;
  nic: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null;
};

export type Course = {
  id: number;
  code: string;
  name: string;
  level: string;
  durationMonths: number;
};

export type Enrollment = {
  id: number;
  student?: Student;
  course?: Course;
  studentId?: number;
  courseId?: number;
};

export type AttendanceStatus = "Present" | "Absent" | "Late";

export type Attendance = {
  id: number;
  enrollment?: Enrollment;
  enrollmentId?: number;
  attendanceDate: string;
  status: AttendanceStatus;
};
