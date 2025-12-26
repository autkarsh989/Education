import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Video, Play, Eye, Calendar, User } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function TeacherVideos() {
  const { teacherId, classLevel } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchTeacherVideos();
  }, [teacherId, classLevel]);

  const fetchTeacherVideos = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${BACKEND_URL}/teachers/by-teacher/${teacherId}/class/${classLevel}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch videos');
      }
      const data = await response.json();
      setData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWatchVideo = (videoId) => {
    navigate(`/watch/${videoId}`);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6">
          <p className="text-red-200">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => navigate('/find-teachers')}
              className="flex items-center space-x-2 text-white/70 hover:text-white mr-6"
            >
              <ArrowLeft size={20} />
              <span>Back to Teachers</span>
            </button>
            <h1 className="text-2xl font-bold text-white">Teacher Videos</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Teacher Info */}
        {data?.teacher && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-8">
            <div className="flex items-start space-x-6">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-2xl">
                  {data.teacher.name?.charAt(0) || 'T'}
                </span>
              </div>
              
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">
                  {data.teacher.name}
                </h2>
                <p className="text-white/70 mb-3">@{data.teacher.username}</p>
                
                {data.teacher.bio && (
                  <p className="text-white/80 mb-4">{data.teacher.bio}</p>
                )}
                
                <div className="flex items-center space-x-6 text-sm text-white/60">
                  {data.teacher.email && (
                    <span>{data.teacher.email}</span>
                  )}
                  <span className="flex items-center space-x-1">
                    <Video size={14} />
                    <span>{data.videos?.length || 0} videos</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Videos Section */}
        <div>
          <h3 className="text-xl font-semibold text-white mb-6">
            Available Videos for {classLevel?.replace('_', ' ').toUpperCase()} ({data?.videos?.length || 0})
          </h3>
          
          {data?.videos && data.videos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {data.videos.map(video => (
                <div key={video.id} className="bg-white/10 backdrop-blur-lg rounded-xl overflow-hidden hover:bg-white/15 transition-all group">
                  {/* Video Thumbnail */}
                  <div className="aspect-video bg-gray-800 relative overflow-hidden">
                    {video.thumbnail ? (
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Video className="text-white/50" size={48} />
                      </div>
                    )}
                    
                    {/* Play Overlay */}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleWatchVideo(video.id)}
                        className="bg-white/20 backdrop-blur-sm rounded-full p-4 hover:bg-white/30 transition-colors"
                      >
                        <Play className="text-white" size={24} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Video Info */}
                  <div className="p-4">
                    <h4 className="font-semibold text-white mb-2 line-clamp-2">
                      {video.title}
                    </h4>
                    
                    {video.description && (
                      <p className="text-white/70 text-sm mb-3 line-clamp-2">
                        {video.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-white/60 mb-3">
                      <span className="bg-white/10 px-2 py-1 rounded">
                        {video.subject || 'General'}
                      </span>
                      <div className="flex items-center space-x-1">
                        <Eye size={12} />
                        <span>{video.view_count} views</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <div className="flex items-center space-x-1">
                        <Calendar size={12} />
                        <span>{formatDate(video.upload_date)}</span>
                      </div>
                      <span>{formatFileSize(video.file_size)}</span>
                    </div>
                    
                    <button
                      onClick={() => handleWatchVideo(video.id)}
                      className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    >
                      Watch Video
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Video className="mx-auto text-white/50 mb-4" size={48} />
              <p className="text-white/70 text-lg">
                No videos available from this teacher
              </p>
              <p className="text-white/50 text-sm mt-2">
                Check back later for new content.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}