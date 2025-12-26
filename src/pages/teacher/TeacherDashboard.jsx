import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacher } from '../../contexts/TeacherContext';
import { Users, Upload, Video, BookOpen, LogOut, Plus, Trash2, Eye } from 'lucide-react';

export default function TeacherDashboard() {
  const { teacher, loading, students, logout, addStudent, removeStudent, fetchStudents } = useTeacher();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ username: '', class: 'class_6' });
  const [addingStudent, setAddingStudent] = useState(false);
  const [studentError, setStudentError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !teacher) {
      navigate('/teacher/login');
    }
  }, [teacher, loading, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (newStudent.username.trim()) {
      setAddingStudent(true);
      setStudentError('');
      
      const result = await addStudent(newStudent);
      if (result.success) {
        setNewStudent({ username: '', class: 'class_6' });
        setShowAddStudent(false);
      } else {
        setStudentError(result.error);
      }
      
      setAddingStudent(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!teacher) return null;

  const classOptions = [
    'class_6', 'class_7', 'class_8', 'class_9', 'class_10', 'class_11', 'class_12'
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm sm:text-lg">
                  {teacher.name?.charAt(0) || 'T'}
                </span>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white">Welcome, {teacher.name}</h1>
                <p className="text-white/70 text-sm">@{teacher.username}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 px-3 py-2 sm:px-4 sm:py-2 rounded-lg transition-colors text-sm"
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 overflow-hidden flex flex-col">
          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-1 bg-white/10 backdrop-blur-lg rounded-lg p-1 mb-6 sm:mb-8 flex-shrink-0">
            {[
              { id: 'overview', label: 'Overview', icon: BookOpen },
              { id: 'students', label: 'Students', icon: Users },
              { id: 'content', label: 'Content', icon: Upload },
              { id: 'videos', label: 'My Videos', icon: Video },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-3 py-2 sm:px-4 sm:py-2 rounded-md transition-all text-sm ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <tab.icon size={16} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content Area with Scroll */}
          <div className="flex-1 overflow-y-auto">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Students</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{students.length}</p>
                </div>
                <Users className="text-blue-300" size={20} />
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Videos</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{teacher.videos?.length || 0}</p>
                </div>
                <Video className="text-green-300" size={20} />
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Total Views</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">
                    {teacher.videos?.reduce((sum, video) => sum + (video.view_count || 0), 0) || 0}
                  </p>
                </div>
                <Eye className="text-purple-300" size={20} />
              </div>
            </div>
            
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/70 text-sm">Content Uploads</p>
                  <p className="text-xl sm:text-2xl font-bold text-white">{teacher.videos?.length || 0}</p>
                </div>
                <Upload className="text-orange-300" size={20} />
              </div>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl sm:text-2xl font-bold text-white">My Students</h2>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/teachers/ping`);
                      const data = await response.text();
                      console.log('PING RESPONSE:', data);
                      alert(`Ping response: ${data}`);
                    } catch (error) {
                      console.error('Ping error:', error);
                      alert('Ping failed: ' + error.message);
                    }
                  }}
                  className="flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                >
                  <span>🏓</span>
                  <span>Ping</span>
                </button>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/teachers/test-simple`);
                      const data = await response.json();
                      console.log('SIMPLE TEST DATA:', data);
                      alert(`Simple test: ${data.message}`);
                    } catch (error) {
                      console.error('Simple test error:', error);
                    }
                  }}
                  className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                >
                  <span>🧪</span>
                  <span>Test API</span>
                </button>
 
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:8000"}/teachers/students-db-direct`);
                      const data = await response.json();
                      console.log('DB DIRECT DATA:', data);
                      alert(`DB Direct: ${data.count} relationships`);
                    } catch (error) {
                      console.error('DB Direct error:', error);
                    }
                  }}
                  className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                >
                  <span>🗄️</span>
                  <span>DB Direct</span>
                </button>
                <button
                  onClick={() => setShowAddStudent(true)}
                  className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                >
                  <Plus size={16} />
                  <span>Add Student</span>
                </button>
              </div>
            </div>

            {/* Add Student Modal */}
            {showAddStudent && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 w-full max-w-md">
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Add New Student</h3>
                  
                  {studentError && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
                      <p className="text-red-200 text-sm">{studentError}</p>
                    </div>
                  )}
                  
                  <form onSubmit={handleAddStudent} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Student Username"
                      value={newStudent.username}
                      onChange={(e) => setNewStudent({...newStudent, username: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 text-sm"
                      required
                      disabled={addingStudent}
                    />
                    <select
                      value={newStudent.class}
                      onChange={(e) => setNewStudent({...newStudent, class: e.target.value})}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
                      disabled={addingStudent}
                    >
                      {classOptions.map(cls => (
                        <option key={cls} value={cls} className="bg-gray-800">
                          {cls.replace('_', ' ').toUpperCase()}
                        </option>
                      ))}
                    </select>
                    <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                      <button
                        type="submit"
                        disabled={addingStudent}
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingStudent ? 'Adding...' : 'Add Student'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddStudent(false);
                          setStudentError('');
                        }}
                        disabled={addingStudent}
                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-lg text-sm disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Students List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student) => (
                <div key={student.username} className="bg-white/10 backdrop-blur-lg rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white text-sm sm:text-base truncate">{student.name || student.username}</h3>
                      <p className="text-white/70 text-xs sm:text-sm truncate">@{student.username}</p>
                      <p className="text-white/70 text-xs sm:text-sm truncate">{student.email || 'No email'}</p>
                      <p className="text-white/70 text-xs sm:text-sm">{student.class_level.replace('_', ' ').toUpperCase()}</p>
                      <p className="text-white/60 text-xs">Enrolled: {new Date(student.enrolled_date).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => removeStudent(student.username)}
                      className="text-red-300 hover:text-red-200 p-1 flex-shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {students.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <p className="text-white/70 text-sm sm:text-base">No students added yet. Click "Add Student" to get started.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Upload Tab */}
        {activeTab === 'content' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Upload Content</h2>
            <button
              onClick={() => navigate('/teacher/upload')}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 transition-all duration-200"
            >
              Go to Upload Page
            </button>
          </div>
        )}

        {/* My Videos Tab */}
        {activeTab === 'videos' && (
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-white">My Videos</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {teacher.videos?.map((video) => (
                <div key={video.id} className="bg-white/10 backdrop-blur-lg rounded-xl p-4">
                  <div className="aspect-video bg-gray-800 rounded-lg mb-4 flex items-center justify-center">
                    <Video className="text-white/50" size={32} />
                  </div>
                  <h3 className="font-semibold text-white mb-2 text-sm sm:text-base line-clamp-2">{video.title}</h3>
                  <p className="text-white/70 text-xs sm:text-sm mb-2 line-clamp-2">{video.description}</p>
                  <div className="flex justify-between items-center text-xs text-white/60">
                    <span>{video.class_level.replace('_', ' ').toUpperCase()}</span>
                    <span>{video.view_count} views</span>
                  </div>
                </div>
              )) || (
                <div className="col-span-full text-center py-8">
                  <p className="text-white/70 text-sm sm:text-base">No videos uploaded yet. Go to Content tab to upload your first video.</p>
                </div>
              )}
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}