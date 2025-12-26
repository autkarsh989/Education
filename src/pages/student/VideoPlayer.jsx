import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Calendar, Eye, BookOpen } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function VideoPlayer() {
  const { videoId } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchVideo();
  }, [videoId]);

  const fetchVideo = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BACKEND_URL}/teachers/videos/${videoId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch video');
      }
      const data = await response.json();
      setVideo(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-6">
          <p className="text-red-200">{error || 'Video not found'}</p>
          <button
            onClick={() => navigate('/find-teachers')}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Back to Teachers
          </button>
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
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-white/70 hover:text-white mr-6"
            >
              <ArrowLeft size={20} />
              <span>Back</span>
            </button>
            <h1 className="text-xl font-bold text-white truncate">{video.title}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Player Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl overflow-hidden">
              {/* Video Player */}
              <div className="aspect-video bg-black">
                <video
                  controls
                  controlsList="nodownload"
                  className="w-full h-full"
                  poster={video.thumbnail}
                >
                  <source src={video.file_path} type="video/mp4" />
                  Your browser does not support HTML5 video.
                </video>
              </div>
              
              {/* Video Info */}
              <div className="p-6">
                <h1 className="text-2xl font-bold text-white mb-4">{video.title}</h1>
                
                <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-white/70">
                  <div className="flex items-center space-x-1">
                    <Eye size={16} />
                    <span>{video.view_count} views</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar size={16} />
                    <span>{formatDate(video.upload_date)}</span>
                  </div>
                  <div className="bg-blue-500/20 px-3 py-1 rounded-full">
                    {video.class_level.replace('_', ' ').toUpperCase()}
                  </div>
                  {video.subject && (
                    <div className="bg-green-500/20 px-3 py-1 rounded-full">
                      {video.subject}
                    </div>
                  )}
                </div>
                
                {video.description && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">About this video</h3>
                    <p className="text-white/80 leading-relaxed">{video.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Teacher Info Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Teacher</h3>
              
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-xl">
                    {video.teacher?.name?.charAt(0) || 'T'}
                  </span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white mb-1">
                    {video.teacher?.name}
                  </h4>
                  <p className="text-white/70 text-sm mb-3">
                    @{video.teacher?.username}
                  </p>
                  
                  {video.teacher?.bio && (
                    <p className="text-white/80 text-sm leading-relaxed">
                      {video.teacher.bio}
                    </p>
                  )}
                  
                  <div className="mt-4 space-y-2 text-sm text-white/60">
                    {video.teacher?.email && (
                      <p>{video.teacher.email}</p>
                    )}
                    {video.teacher?.phone_number && (
                      <p>{video.teacher.phone_number}</p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => navigate(`/teacher/${video.teacher.id}/videos/${video.class_level}`)}
                    className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                  >
                    View More Videos
                  </button>
                </div>
              </div>
            </div>
            
            {/* Video Stats */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mt-6">
              <h3 className="text-lg font-semibold text-white mb-4">Video Details</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/70">Class Level:</span>
                  <span className="text-white">{video.class_level.replace('_', ' ').toUpperCase()}</span>
                </div>
                
                {video.subject && (
                  <div className="flex justify-between">
                    <span className="text-white/70">Subject:</span>
                    <span className="text-white">{video.subject}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-white/70">Views:</span>
                  <span className="text-white">{video.view_count}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="text-white/70">Uploaded:</span>
                  <span className="text-white">{formatDate(video.upload_date)}</span>
                </div>
                
                {video.duration && (
                  <div className="flex justify-between">
                    <span className="text-white/70">Duration:</span>
                    <span className="text-white">{Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}</span>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <span className="text-white/70">File Size:</span>
                  <span className="text-white">{(video.file_size / (1024*1024)).toFixed(2)} MB</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}