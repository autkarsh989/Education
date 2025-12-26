import { createContext, useContext, useState, useEffect } from 'react';

const TeacherContext = createContext();

export const useTeacher = () => {
  const context = useContext(TeacherContext);
  if (!context) {
    throw new Error('useTeacher must be used within a TeacherProvider');
  }
  return context;
};

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export const TeacherProvider = ({ children }) => {
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('teacherToken');
    if (token) {
      fetchTeacherProfile(token);
      fetchStudents(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchTeacherProfile = async (token) => {
    try {
      const response = await fetch(`${BACKEND_URL}/teachers/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setTeacher(data);
      } else {
        localStorage.removeItem('teacherToken');
        localStorage.removeItem('teacherId');
        localStorage.removeItem('teacherUsername');
      }
    } catch (error) {
      console.error('Error fetching teacher profile:', error);
      localStorage.removeItem('teacherToken');
      localStorage.removeItem('teacherId');
      localStorage.removeItem('teacherUsername');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (token, forceRefresh = false) => {
    try {
      console.log('DEBUG: Fetching students...', forceRefresh ? '(forced)' : '');
      
      // Get teacher username from localStorage
      const teacherUsername = localStorage.getItem('teacherUsername');
      if (!teacherUsername) {
        console.log('DEBUG: No teacher username found');
        return [];
      }
      
      // Use the raw endpoint that works
      const url = `${BACKEND_URL}/teachers/students-raw?teacher_username=${teacherUsername}${forceRefresh ? '&_t=' + Date.now() : ''}`;
      const response = await fetch(url);

      console.log('DEBUG: Fetch students response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('DEBUG: Students fetched:', data);
        
        // Extract students array from the response
        const students = data.students || [];
        setStudents(students);
        return students;
      } else {
        console.log('DEBUG: Failed to fetch students:', response.status, await response.text());
        return [];
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  };

  const login = async (credentials) => {
    try {
      const response = await fetch(`${BACKEND_URL}/teachers/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('teacherToken', data.access_token);
      localStorage.setItem('teacherId', data.teacher_id);
      localStorage.setItem('teacherUsername', data.username);

      await fetchTeacherProfile(data.access_token);
      await fetchStudents(data.access_token);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (formData) => {
    try {
      const response = await fetch(`${BACKEND_URL}/teachers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('teacherToken');
    localStorage.removeItem('teacherId');
    localStorage.removeItem('teacherUsername');
    setTeacher(null);
    setStudents([]);
  };

  const addStudent = async (student) => {
    try {
      console.log('DEBUG: Adding student:', student);
      const token = localStorage.getItem('teacherToken');
      const requestBody = {
        student_username: student.username,
        class_level: student.class
      };
      console.log('DEBUG: Request body:', requestBody);
      
      const response = await fetch(`${BACKEND_URL}/teachers/students/add`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(requestBody),
      });

      console.log('DEBUG: Add student response status:', response.status);
      
      if (!response.ok) {
        const error = await response.json();
        console.log('DEBUG: Add student error:', error);
        throw new Error(error.detail || 'Failed to add student');
      }

      const result = await response.json();
      console.log('DEBUG: Add student success:', result);

      // Refresh students list with force refresh
      const updatedStudents = await fetchStudents(token, true);
      console.log('DEBUG: Students after adding:', updatedStudents);
      return { success: true };
    } catch (error) {
      console.error('DEBUG: Add student exception:', error);
      return { success: false, error: error.message };
    }
  };

  const removeStudent = async (studentUsername) => {
    try {
      const token = localStorage.getItem('teacherToken');
      const response = await fetch(`${BACKEND_URL}/teachers/students/${studentUsername}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to remove student');
      }

      // Refresh students list
      await fetchStudents(token);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const uploadContent = async (formData) => {
    try {
      const token = localStorage.getItem('teacherToken');
      const response = await fetch(`${BACKEND_URL}/teachers/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Upload failed');
      }

      const data = await response.json();
      // Refresh teacher profile to get updated videos/content
      await fetchTeacherProfile(token);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const uploadMultipleFiles = async (formData) => {
    try {
      const token = localStorage.getItem('teacherToken');
      const response = await fetch(`${BACKEND_URL}/teachers/upload/multiple`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Multiple upload failed');
      }

      const data = await response.json();
      // Refresh teacher profile to get updated content
      await fetchTeacherProfile(token);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const getUploadInfo = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/teachers/upload/info`);
      
      if (!response.ok) {
        throw new Error('Failed to get upload info');
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const getTeacherFiles = async (fileType = null) => {
    try {
      const token = localStorage.getItem('teacherToken');
      const url = fileType 
        ? `${BACKEND_URL}/teachers/files?file_type=${fileType}`
        : `${BACKEND_URL}/teachers/files`;
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to get files');
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const deleteFile = async (fileType, fileId) => {
    try {
      const token = localStorage.getItem('teacherToken');
      const response = await fetch(`${BACKEND_URL}/teachers/files/${fileType}/${fileId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete file');
      }

      // Refresh teacher profile to get updated content
      await fetchTeacherProfile(token);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    teacher,
    loading,
    students,
    login,
    register,
    logout,
    addStudent,
    removeStudent,
    uploadContent,
    uploadMultipleFiles,
    getUploadInfo,
    getTeacherFiles,
    deleteFile,
    fetchTeacherProfile,
    fetchStudents
  };

  return (
    <TeacherContext.Provider value={value}>
      {children}
    </TeacherContext.Provider>
  );
};