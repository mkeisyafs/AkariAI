import { useState } from 'react';
import { useKnowledge } from '../../hooks/useKnowledge';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  BookOpen,
  Tag,
  FileText,
  Save,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface KnowledgeConfigFormProps {
  guildId: string;
}

export default function KnowledgeConfigForm({ guildId }: KnowledgeConfigFormProps) {
  const {
    knowledge,
    categories,
    loading,
    fetchKnowledge,
    addKnowledge,
    updateKnowledge,
    deleteKnowledge,
  } = useKnowledge(guildId);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    key: '',
    value: '',
    category: 'general',
    description: '',
  });

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (term.trim()) {
      fetchKnowledge(undefined, term);
    } else {
      fetchKnowledge(selectedCategory || undefined);
    }
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    setSearchTerm('');
    fetchKnowledge(category || undefined);
  };

  const handleAdd = async () => {
    if (!formData.key || !formData.value) {
      toast.error('Key and value are required');
      return;
    }

    const result = await addKnowledge(
      formData.key,
      formData.value,
      formData.category,
      formData.description || undefined
    );

    if (result?.success) {
      toast.success('Knowledge entry added successfully');
      setShowAddModal(false);
      setFormData({ key: '', value: '', category: 'general', description: '' });
    } else {
      toast.error(result?.error || 'Failed to add knowledge entry');
    }
  };

  const handleEdit = async (key: string) => {
    const entry = knowledge.find((k) => k.key === key);
    if (!entry) return;

    setEditingKey(key);
    setFormData({
      key: entry.key,
      value: entry.value,
      category: entry.category,
      description: entry.description || '',
    });
  };

  const handleUpdate = async () => {
    if (!editingKey) return;

    const result = await updateKnowledge(editingKey, {
      value: formData.value,
      category: formData.category,
      description: formData.description || undefined,
    });

    if (result?.success) {
      toast.success('Knowledge entry updated successfully');
      setEditingKey(null);
      setFormData({ key: '', value: '', category: 'general', description: '' });
    } else {
      toast.error(result?.error || 'Failed to update knowledge entry');
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm(`Are you sure you want to delete the knowledge entry "${key}"?`)) {
      return;
    }

    const result = await deleteKnowledge(key);

    if (result?.success) {
      toast.success('Knowledge entry deleted successfully');
    } else {
      toast.error(result?.error || 'Failed to delete knowledge entry');
    }
  };

  const filteredKnowledge = knowledge;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-discord-blurple" />
            Knowledge Base
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage custom knowledge entries for your AI assistant
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-discord-blurple hover:bg-discord-blurple-dark text-white rounded-lg transition"
        >
          <Plus className="h-4 w-4" />
          Add Knowledge
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search knowledge entries..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-discord-dark border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-discord-blurple"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => handleCategoryFilter(e.target.value)}
          className="px-4 py-2 bg-discord-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-400">Loading knowledge entries...</p>
        </div>
      ) : filteredKnowledge.length === 0 ? (
        <div className="text-center py-12 bg-discord-dark rounded-lg border border-gray-700">
          <BookOpen className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No knowledge entries found</p>
          <p className="text-sm text-gray-500 mt-1">
            Add your first knowledge entry to get started
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredKnowledge.map((entry) => (
            <div
              key={entry.id}
              className="bg-discord-dark border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition"
            >
              {editingKey === entry.key ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Key (read-only)
                    </label>
                    <input
                      type="text"
                      value={formData.key}
                      disabled
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Value
                    </label>
                    <textarea
                      value={formData.value}
                      onChange={(e) =>
                        setFormData({ ...formData, value: e.target.value })
                      }
                      rows={3}
                      className="w-full px-3 py-2 bg-discord-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Category
                      </label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) =>
                          setFormData({ ...formData, category: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-discord-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        className="w-full px-3 py-2 bg-discord-dark border border-gray-600 rounded-lg text-white focus:outline-none focus:border-discord-blurple"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUpdate}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
                    >
                      <Save className="h-4 w-4" />
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingKey(null);
                        setFormData({
                          key: '',
                          value: '',
                          category: 'general',
                          description: '',
                        });
                      }}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {entry.key}
                      </h3>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-discord-blurple/20 text-discord-blurple text-xs rounded">
                        <Tag className="h-3 w-3" />
                        {entry.category}
                      </span>
                    </div>
                    <p className="text-gray-300 mb-2 break-words">{entry.value}</p>
                    {entry.description && (
                      <p className="text-sm text-gray-400 flex items-start gap-1">
                        <FileText className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {entry.description}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Updated: {new Date(entry.updatedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(entry.key)}
                      className="p-2 hover:bg-gray-700 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.key)}
                      className="p-2 hover:bg-red-600/20 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-discord-gray rounded-lg p-6 max-w-2xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Add Knowledge Entry</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({
                    key: '',
                    value: '',
                    category: 'general',
                    description: '',
                  });
                }}
                className="p-2 hover:bg-gray-700 rounded-lg transition"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Key *
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="e.g., server_rules"
                  className="w-full px-3 py-2 bg-discord-dark border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-discord-blurple"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique identifier for this knowledge entry
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Value *
                </label>
                <textarea
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="Enter the knowledge content..."
                  rows={4}
                  className="w-full px-3 py-2 bg-discord-dark border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-discord-blurple"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="general"
                    className="w-full px-3 py-2 bg-discord-dark border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-discord-blurple"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Optional description"
                    className="w-full px-3 py-2 bg-discord-dark border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-discord-blurple"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleAdd}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-discord-blurple hover:bg-discord-blurple-dark text-white rounded-lg transition"
                >
                  <Plus className="h-4 w-4" />
                  Add Knowledge
                </button>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setFormData({
                      key: '',
                      value: '',
                      category: 'general',
                      description: '',
                    });
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
