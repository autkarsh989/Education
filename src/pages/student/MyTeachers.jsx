import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../../hooks/useUser';
import { ArrowLeft, Users, Video, Calendar, BookOpen } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function MyTeachers() {
  const { user } = useUser();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.username) {
      fetchMyTeachers();
    }
  }, [user]);

  const fetchMyTeachers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/teachers/my-teachers?student_username=${user.username}`);
      if (!response.ok) {
        if (response.status === 404) {
          setTeachers([]);
          return;
        }
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

  const handleViewVideos = (teacherId, classLevel) => {
    navigate(`/teacher/${teacherId}/videos/${classLevel}`);
  };

  if (!user) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
          <p className="text-white">Please login to view your teachers.</p>
        </div>
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold text-white">My Teachers</h1>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 h-full flex flex-col">
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

            {/* Teachers List */}
            {!loading && !error && (
              <div>
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-white mb-2">
                    Teachers you're enrolled with ({teachers.length})
                  </h2>
                  <p className="text-white/70 text-sm">
                    These teachers have added you to their student list and you can access their content.
                  </p>
                </div>
                
                {teachers.length > 0 ? (
                  <div className="space-y-6">
                    {teachers.map((teacherData, index) => (
                      <div key={teacherData.teacher.id} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 hover:bg-white/15 transition-all">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start space-x-4">
                            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-bold text-xl">
                                {teacherData.teacher.name?.charAt(0) || 'T'}
                              </span>
                            </div>
                            
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-white mb-1">
                                {teacherData.teacher.name}
                              </h3>
                              <p className="text-white/70 text-sm mb-2">@{teacherData.teacher.username}</p>
                              
                              {teacherData.teacher.bio && (
                                <p className="text-white/80 text-sm mb-3">{teacherData.teacher.bio}</p>
                              )}
                              
                              <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
                                <div className="flex items-center space-x-1">
                                  <Calendar size={14} />
                                  <span>Enrolled: {new Date(teacherData.enrolled_date).toLocaleDateString()}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <BookOpen size={14} />
                                  <span>Class: {teacherData.class_level.replace('_', ' ').toUpperCase()}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Video size={14} />
                                  <span>{teacherData.video_count} videos available</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleViewVideos(teacherData.teacher.id, teacherData.class_level)}
                            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
                          >
                            View Content
                          </button>
                        </div>
                        
                        {/* Recent Videos Preview */}
                        {teacherData.videos && teacherData.videos.length > 0 && (
                          <div>
                            <h4 className="text-white font-medium mb-3">Recent Videos:</h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {teacherData.videos.slice(0, 3).map((video) => (
                                <div key={video.id} className="bg-white/5 rounded-lg p-3">
                                  <h5 className="text-white text-sm font-medium mb-1 line-clamp-1">
                                    {video.title}
                                  </h5>
                                  <p className="text-white/60 text-xs mb-2 line-clamp-2">
                                    {video.description || 'No description'}
                                  </p>
                                  <div className="flex justify-between items-center text-xs text-white/50">
                                    <span>{video.subject || 'General'}</span>
                                    <span>{video.view_count} views</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {teacherData.videos.length > 3 && (
                              <p className="text-white/60 text-sm mt-2">
                                +{teacherData.videos.length - 3} more videos available
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="mx-auto text-white/50 mb-4" size={48} />
                    <h3 className="text-white/70 text-lg mb-2">No teachers yet</h3>
                    <p className="text-white/50 text-sm mb-4">
                      You haven't been enrolled by any teachers yet.
                    </p>
                    <button
                      onClick={() => navigate('/find-teachers')}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                      Browse All Teachers
                    </button>
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