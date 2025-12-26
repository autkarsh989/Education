import { useTeacher } from '../contexts/TeacherContext';
import { Navigate } from 'react-router-dom';

export default function TeacherLayout({ children }) {
  const { teacher, loading } = useTeacher();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!teacher) {
    return <Navigate to="/teacher/login" replace />;
  }

  return <>{children}</>;
}