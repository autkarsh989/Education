import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Video, Mail, Phone } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function FindTeachers() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedClass, setSelectedClass] = useState('class_6');
  const navigate = useNavigate();

  const classOptions = [
    'class_6', 'class_7', 'class_8', 'class_9', 'class_10', 'class_11', 'class_12'
  ];

  useEffect(() => {
    fetchTeachers();
  }, [selectedClass]);

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/teachers/class/${selectedClass}`);
      if (!response.ok) {
        throw new Error('Failed to fetch teachers');
      }
      const data = await response.json();
      setTeachers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewVideos = (teacherId) => {
    navigate(`/teacher/${teacherId}/videos/${selectedClass}`);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20 flex-shrink-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-white/70 hover:text-white mr-6"
            >
              <ArrowLeft size={20} />
              <span>Back to Home</span>
            </button>
            <h1 className="text-2xl font-bold text-white">Find Teachers</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 h-full flex flex-col">
        {/* Class Selection */}
        <div className="mb-6 sm:mb-8 flex-shrink-0">
          <label className="block text-white/90 text-sm font-medium mb-3">
            Select Your Class
          </label>
          <div className="flex flex-wrap gap-2">
            {classOptions.map(cls => (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`px-3 py-2 sm:px-4 sm:py-2 rounded-lg font-medium transition-all text-sm ${
                  selectedClass === cls
                    ? 'bg-white text-blue-600'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {cls.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area with Scroll */}
        <div className="flex-1 overflow-y-auto">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
            </div>
          )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Teachers Grid */}
        {!loading && !error && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-6">
              Teachers for {selectedClass.replace('_', ' ').toUpperCase()} ({teachers.length})
            </h2>
            
            {teachers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {teachers.map(teacher => (
                  <div key={teacher.id} className="bg-white/10 backdrop-blur-lg rounded-xl p-4 sm:p-6 hover:bg-white/15 transition-all">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-bold text-sm sm:text-xl">
                          {teacher.name?.charAt(0) || 'T'}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-semibold text-white truncate">
                          {teacher.name}
                        </h3>
                        <p className="text-white/70 text-sm">@{teacher.username}</p>
                        
                        {teacher.bio && (
                          <p className="text-white/80 text-sm mt-2 line-clamp-2">
                            {teacher.bio}
                          </p>
                        )}
                        
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-3 text-sm text-white/60 space-y-1 sm:space-y-0">
                          {teacher.email && (
                            <div className="flex items-center space-x-1">
                              <Mail size={14} />
                              <span className="truncate">{teacher.email}</span>
                            </div>
                          )}
                          {teacher.phone_number && (
                            <div className="flex items-center space-x-1">
                              <Phone size={14} />
                              <span>{teacher.phone_number}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between mt-4">
                          <div className="flex items-center space-x-1 text-white/70">
                            <Video size={16} />
                            <span className="text-sm">{teacher.video_count} videos</span>
                          </div>
                          
                          <button
                            onClick={() => handleViewVideos(teacher.id)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            View Videos
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="mx-auto text-white/50 mb-4" size={48} />
                <p className="text-white/70 text-lg">
                  No teachers found for {selectedClass.replace('_', ' ').toUpperCase()}
                </p>
                <p className="text-white/50 text-sm mt-2">
                  Try selecting a different class or check back later.
                </p>
              </div>
            )}
          </div>
        )}
        </div>
        </div>
      </div>
    </div>
  );
}