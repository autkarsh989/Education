import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeacher } from '../../contexts/TeacherContext';
import { Upload, Video, FileText, Image, ArrowLeft, Plus, X } from 'lucide-react';

export default function TeacherUpload() {
  const [activeTab, setActiveTab] = useState('video');
  const [uploadMode, setUploadMode] = useState('single'); // 'single' or 'multiple'
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    class_level: 'class_6',
    subject: '',
    file: null,
    files: [], // for multiple uploads
  });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadInfo, setUploadInfo] = useState(null);
  
  const { uploadContent, uploadMultipleFiles, getUploadInfo } = useTeacher();
  const navigate = useNavigate();

  // Fetch upload info on component mount
  useEffect(() => {
    const fetchUploadInfo = async () => {
      const result = await getUploadInfo();
      if (result.success) {
        setUploadInfo(result.data);
      }
    };
    fetchUploadInfo();
  }, [getUploadInfo]);

  const classOptions = [
    'class_6', 'class_7', 'class_8', 'class_9', 'class_10', 'class_11', 'class_12'
  ];

  const subjectOptions = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English', 
    'Hindi', 'Social Studies', 'Computer Science', 'Geography', 'History'
  ];

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'file') {
      setFormData({
        ...formData,
        file: files ? files[0] : null,
      });
    } else if (name === 'files') {
      setFormData({
        ...formData,
        files: files ? Array.from(files) : [],
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const removeFile = (index) => {
    const newFiles = formData.files.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      files: newFiles,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setError('');
    setSuccess('');

    try {
      const uploadFormData = new FormData();
      uploadFormData.append('title', formData.title);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('class_level', formData.class_level);
      uploadFormData.append('subject', formData.subject);

      let result;
      
      if (uploadMode === 'single') {
        uploadFormData.append('file', formData.file);
        result = await uploadContent(uploadFormData);
      } else {
        // Multiple files upload
        formData.files.forEach(file => {
          uploadFormData.append('files', file);
        });
        result = await uploadMultipleFiles(uploadFormData);
      }
      
      if (result.success) {
        if (uploadMode === 'single') {
          setSuccess(`Content "${formData.title}" uploaded successfully!`);
        } else {
          const { success_count, error_count } = result.data;
          setSuccess(`Upload completed! ${success_count} files uploaded successfully${error_count > 0 ? `, ${error_count} failed` : ''}.`);
        }
        
        setFormData({
          title: '',
          description: '',
          class_level: 'class_6',
          subject: '',
          file: null,
          files: [],
        });
        
        // Reset file inputs
        const fileInputs = document.querySelectorAll('input[type="file"]');
        fileInputs.forEach(input => input.value = '');
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'video': return <Video className="text-blue-400" size={24} />;
      case 'document': return <FileText className="text-green-400" size={24} />;
      case 'image': return <Image className="text-purple-400" size={24} />;
      default: return <Upload className="text-gray-400" size={24} />;
    }
  };

  const getAcceptedFormats = (type) => {
    if (!uploadInfo) {
      // Fallback values
      switch (type) {
        case 'video': return '.mp4,.avi,.mov,.webm,.mkv,.flv,.wmv';
        case 'document': return '.pdf,.doc,.docx,.ppt,.pptx,.txt';
        case 'image': return '.jpg,.jpeg,.png,.gif,.bmp,.svg';
        default: return '*';
      }
    }
    
    const typeInfo = uploadInfo.supported_types[type];
    return typeInfo ? typeInfo.extensions.join(',') : '*';
  };

  const getMaxSize = (type) => {
    if (!uploadInfo) {
      // Fallback values
      switch (type) {
        case 'video': return '500MB';
        case 'document': return '50MB';
        case 'image': return '10MB';
        default: return '500MB';
      }
    }
    
    const typeInfo = uploadInfo.supported_types[type];
    return typeInfo ? `${typeInfo.max_size_mb}MB` : '500MB';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-4">
            <button
              onClick={() => navigate('/teacher/dashboard')}
              className="flex items-center space-x-2 text-white/70 hover:text-white mr-6"
            >
              <ArrowLeft size={20} />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-2xl font-bold text-white">Upload Content</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Content Type Tabs */}
        <div className="flex space-x-1 bg-white/10 backdrop-blur-lg rounded-lg p-1 mb-8">
          {[
            { id: 'video', label: 'Video', icon: Video },
            { id: 'document', label: 'Document', icon: FileText },
            { id: 'image', label: 'Image', icon: Image },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <tab.icon size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Upload Form */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4 mb-6">
              <p className="text-green-200">{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                placeholder={`e.g., ${activeTab === 'video' ? 'Algebra Basics Tutorial' : activeTab === 'document' ? 'Mathematics Formula Sheet' : 'Geometry Diagrams'}`}
              />
            </div>

            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
                placeholder="Describe what students will learn from this content..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">
                  Class Level *
                </label>
                <select
                  name="class_level"
                  value={formData.class_level}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                >
                  {classOptions.map(cls => (
                    <option key={cls} value={cls} className="bg-gray-800">
                      {cls.replace('_', ' ').toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">
                  Subject
                </label>
                <select
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                >
                  <option value="" className="bg-gray-800">Select Subject</option>
                  {subjectOptions.map(subject => (
                    <option key={subject} value={subject} className="bg-gray-800">
                      {subject}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-white/90 text-sm font-medium mb-2">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} File *
              </label>
              <div className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center">
                <div className="flex flex-col items-center space-y-4">
                  {getFileIcon(activeTab)}
                  <div>
                    <input
                      type="file"
                      name="file"
                      onChange={handleChange}
                      required
                      accept={getAcceptedFormats(activeTab)}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                    >
                      Choose {activeTab} file
                    </label>
                  </div>
                  <p className="text-white/60 text-sm">
                    Max size: {getMaxSize(activeTab)}
                  </p>
                  {formData.file && (
                    <p className="text-white/80 text-sm">
                      Selected: {formData.file.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Uploading... {progress}%</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <Upload size={20} />
                  <span>Upload {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
                </div>
              )}
            </button>
          </form>
        </div>

        {/* Upload Guidelines */}
        <div className="mt-8 bg-white/5 backdrop-blur-lg rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Upload Guidelines</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-white/70">
            <div>
              <h4 className="font-medium text-white mb-2">Video Files</h4>
              <ul className="space-y-1">
                <li>• Formats: MP4, AVI, MOV, WebM</li>
                <li>• Max size: 500MB</li>
                <li>• Recommended: 720p or higher</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Documents</h4>
              <ul className="space-y-1">
                <li>• Formats: PDF, DOC, PPT</li>
                <li>• Max size: 50MB</li>
                <li>• Clear, readable content</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Images</h4>
              <ul className="space-y-1">
                <li>• Formats: JPG, PNG, GIF</li>
                <li>• Max size: 10MB</li>
                <li>• High resolution preferred</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}