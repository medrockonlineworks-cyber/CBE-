import React, { useState, useRef } from 'react';
import { 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  Trash2, 
  Copy, 
  Edit2, 
  Image as ImageIcon, 
  Calendar, 
  MessageSquare, 
  Check, 
  X, 
  Upload, 
  AlertCircle,
  FileText,
  UserCheck,
  User,
  Sliders,
  Eye,
  Layers
} from 'lucide-react';
import { 
  TelegramChat, 
  TelegramMessage, 
  TelegramMessageType, 
  TelegramSender, 
  TelegramReadStatus,
  TelegramImageItem 
} from '../../types/telegram';

interface TelegramEditorProps {
  chat: TelegramChat;
  onAddMessage: (msg: Omit<TelegramMessage, 'id'>) => void;
  onUpdateMessage: (msgId: string, updates: Partial<TelegramMessage>) => void;
  onDeleteMessage: (msgId: string) => void;
  onMoveMessage: (msgId: string, direction: 'up' | 'down') => void;
  onDuplicateMessage: (msgId: string) => void;
  onOpenPreview: () => void;
  onOpenSettings: () => void;
}

export default function TelegramEditor({
  chat,
  onAddMessage,
  onUpdateMessage,
  onDeleteMessage,
  onMoveMessage,
  onDuplicateMessage,
  onOpenPreview,
  onOpenSettings,
}: TelegramEditorProps) {
  // Modal / Drawer state for adding or editing a message
  const [isEditingModalOpen, setIsEditingModalOpen] = useState<boolean>(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // Form Fields
  const [formSender, setFormSender] = useState<TelegramSender>('right');
  const [formType, setFormType] = useState<TelegramMessageType>('text');
  const [formText, setFormText] = useState<string>('');
  const [formTimestamp, setFormTimestamp] = useState<string>('10:30 AM');
  const [formDateLabel, setFormDateLabel] = useState<string>('Today');
  const [formStatus, setFormStatus] = useState<TelegramReadStatus>('read');
  const [formImages, setFormImages] = useState<TelegramImageItem[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to open create form
  const openCreateModal = (type: TelegramMessageType = 'text', sender: TelegramSender = 'right') => {
    setEditingMessageId(null);
    setFormSender(sender);
    setFormType(type);
    setFormText('');
    setFormTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setFormDateLabel('Today');
    setFormStatus('read');
    setFormImages([]);
    setIsEditingModalOpen(true);
  };

  // Helper to open edit form
  const openEditModal = (msg: TelegramMessage) => {
    setEditingMessageId(msg.id);
    setFormSender(msg.sender);
    setFormType(msg.type);
    setFormText(msg.text || '');
    setFormTimestamp(msg.timestamp || '10:30 AM');
    setFormDateLabel(msg.dateLabel || 'Today');
    setFormStatus(msg.status || 'read');
    setFormImages(msg.images ? [...msg.images] : []);
    setIsEditingModalOpen(true);
  };

  // Image Upload Handler (reads to base64 data URL)
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const result = uploadEvent.target?.result as string;
        if (result) {
          const newItem: TelegramImageItem = {
            id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            url: result,
            caption: file.name.replace(/\.[^/.]+$/, ''),
            name: file.name,
          };
          setFormImages((prev) => [...prev, newItem]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImageFromForm = (imgId: string) => {
    setFormImages((prev) => prev.filter((i) => i.id !== imgId));
  };

  // Form Save
  const handleSaveMessage = () => {
    if (formType === 'text' && !formText.trim()) {
      alert('Please enter message text');
      return;
    }
    if ((formType === 'image' || formType === 'album') && formImages.length === 0) {
      alert('Please upload at least one image');
      return;
    }

    const payload: Omit<TelegramMessage, 'id'> = {
      sender: formSender,
      type: formType,
      text: formText.trim(),
      timestamp: formTimestamp.trim() || '10:30 AM',
      dateLabel: formDateLabel.trim(),
      status: formStatus,
      images: formImages.length > 0 ? formImages : undefined,
    };

    if (editingMessageId) {
      onUpdateMessage(editingMessageId, payload);
    } else {
      onAddMessage(payload);
    }

    setIsEditingModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-900 text-slate-100 overflow-hidden select-none">
      {/* Top Header Card */}
      <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          {chat.avatarUrl ? (
            <img 
              src={chat.avatarUrl} 
              alt={chat.contactName} 
              className="w-10 h-10 rounded-full object-cover border border-sky-500/30 shrink-0" 
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-sky-600 flex items-center justify-center font-bold text-white shrink-0">
              {chat.contactName.charAt(0)}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-white truncate">{chat.contactName}</h3>
            <p className="text-xs text-sky-400 truncate">{chat.username} • {chat.status}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Chat settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button 
            onClick={onOpenPreview}
            className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* Quick Action Buttons for message types */}
      <div className="p-3 bg-slate-950/40 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
        <button 
          onClick={() => openCreateModal('text', 'right')}
          className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Right (Me)</span>
        </button>

        <button 
          onClick={() => openCreateModal('text', 'left')}
          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Left (Contact)</span>
        </button>

        <button 
          onClick={() => openCreateModal('image', 'right')}
          className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition"
        >
          <ImageIcon className="w-3.5 h-3.5" />
          <span>+ Image</span>
        </button>

        <button 
          onClick={() => openCreateModal('album', 'right')}
          className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>+ Album</span>
        </button>

        <button 
          onClick={() => openCreateModal('date', 'left')}
          className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 shrink-0 cursor-pointer transition"
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>+ Date</span>
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-400 font-medium px-1">
          <span>Conversation Order ({chat.messages.length} messages)</span>
          <span className="text-[11px] text-slate-500">Reorder with ↑ ↓</span>
        </div>

        {chat.messages.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
            <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-300">No simulated messages yet</p>
            <p className="text-xs text-slate-500 mt-1">Add your first text message, photo or date badge</p>
          </div>
        ) : (
          chat.messages.map((msg, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === chat.messages.length - 1;

            if (msg.type === 'date') {
              return (
                <div 
                  key={msg.id}
                  className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-amber-300">
                      Date Separator: "{msg.dateLabel || msg.timestamp}"
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => onMoveMessage(msg.id, 'up')}
                      disabled={isFirst}
                      className="p-1 rounded-md text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => onMoveMessage(msg.id, 'down')}
                      disabled={isLast}
                      className="p-1 rounded-md text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => openEditModal(msg)}
                      className="p-1 rounded-md text-sky-400 hover:text-sky-300 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => onDeleteMessage(msg.id)}
                      className="p-1 rounded-md text-red-400 hover:text-red-300 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            }

            const isRight = msg.sender === 'right';

            return (
              <div 
                key={msg.id}
                className={`p-3 rounded-2xl border transition ${
                  isRight 
                    ? 'bg-slate-950/70 border-sky-900/40 hover:border-sky-700/50' 
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isRight ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {isRight ? 'RIGHT (Me)' : `LEFT (${chat.contactName})`}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                      {msg.type}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {msg.timestamp}
                    </span>
                  </div>

                  {/* Reorder / Action Controls */}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => onMoveMessage(msg.id, 'up')}
                      disabled={isFirst}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition cursor-pointer"
                      title="Move up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => onMoveMessage(msg.id, 'down')}
                      disabled={isLast}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition cursor-pointer"
                      title="Move down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => onDuplicateMessage(msg.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                      title="Duplicate"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => openEditModal(msg)}
                      className="p-1 rounded-md text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 transition cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => onDeleteMessage(msg.id)}
                      className="p-1 rounded-md text-red-400 hover:text-red-300 hover:bg-red-950/40 transition cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Message Content Preview */}
                {msg.images && msg.images.length > 0 && (
                  <div className="flex items-center gap-2 mb-2 overflow-x-auto py-1">
                    {msg.images.map((img) => (
                      <img 
                        key={img.id} 
                        src={img.url} 
                        alt="attachment" 
                        className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0" 
                      />
                    ))}
                    <span className="text-xs text-slate-400">
                      {msg.images.length} photo{msg.images.length > 1 ? 's' : ''}
                    </span>
                  </div>
                )}

                {msg.text && (
                  <p className="text-xs text-slate-200 line-clamp-3 leading-relaxed">
                    {msg.text}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Message Creation & Editing Modal / Bottom Sheet */}
      {isEditingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom-6">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                {editingMessageId ? 'Edit Simulated Message' : 'Add Simulated Message'}
              </h3>
              <button 
                onClick={() => setIsEditingModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Sender Selector: Left or Right */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">
                  Sender Position
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setFormSender('left')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      formSender === 'left' 
                        ? 'bg-slate-700 border-slate-500 text-white shadow-xs' 
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Left ({chat.contactName})</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormSender('right')}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                      formSender === 'right' 
                        ? 'bg-sky-600 border-sky-400 text-white shadow-xs' 
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Right (Me / Customer)</span>
                  </button>
                </div>
              </div>

              {/* Message Type Selector */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5">
                  Message Type
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['text', 'image', 'album', 'date'] as TelegramMessageType[]).map((t) => (
                    <button 
                      key={t}
                      type="button"
                      onClick={() => setFormType(t)}
                      className={`py-2 rounded-xl text-center font-semibold capitalize border transition cursor-pointer ${
                        formType === t 
                          ? 'bg-sky-500/20 border-sky-400 text-sky-300' 
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Input (or Caption) */}
              {formType !== 'date' && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">
                    {formType === 'text' ? 'Message Text' : 'Caption (Optional)'}
                  </label>
                  <textarea 
                    rows={3}
                    value={formText}
                    onChange={(e) => setFormText(e.target.value)}
                    placeholder={formType === 'text' ? 'Type message text here...' : 'Optional image caption'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-100 placeholder-slate-500 outline-none focus:border-sky-500"
                  />
                </div>
              )}

              {/* Date separator text */}
              {formType === 'date' && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5">
                    Date Label
                  </label>
                  <input 
                    type="text"
                    value={formDateLabel}
                    onChange={(e) => setFormDateLabel(e.target.value)}
                    placeholder="e.g. Today, Yesterday, September 15"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 outline-none focus:border-sky-500"
                  />
                </div>
              )}

              {/* Image & Album Uploads */}
              {(formType === 'image' || formType === 'album') && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-400 font-semibold">
                      Uploaded Photos ({formImages.length})
                    </label>
                    <button 
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload from Device</span>
                    </button>
                    <input 
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple={formType === 'album'}
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>

                  {formImages.length === 0 ? (
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-6 border-2 border-dashed border-slate-800 rounded-2xl text-center cursor-pointer hover:border-sky-500/50 transition"
                    >
                      <ImageIcon className="w-8 h-8 text-slate-500 mx-auto mb-1.5" />
                      <p className="text-xs text-slate-300 font-medium">Click to select photo(s)</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Supports JPG, PNG, WebP (Converted to local Data URL)</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {formImages.map((img) => (
                        <div key={img.id} className="relative group rounded-xl overflow-hidden aspect-square border border-slate-800">
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                          <button 
                            type="button"
                            onClick={() => removeImageFromForm(img.id)}
                            className="absolute top-1 right-1 p-1 bg-red-600 rounded-full text-white opacity-90 hover:opacity-100 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Timestamp & Read Status (for standard messages) */}
              {formType !== 'date' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">
                      Timestamp
                    </label>
                    <input 
                      type="text"
                      value={formTimestamp}
                      onChange={(e) => setFormTimestamp(e.target.value)}
                      placeholder="e.g. 10:30 AM"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 outline-none focus:border-sky-500"
                    />
                  </div>

                  {formSender === 'right' && (
                    <div>
                      <label className="block text-slate-400 font-semibold mb-1">
                        Read Status
                      </label>
                      <select 
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as TelegramReadStatus)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-100 outline-none focus:border-sky-500"
                      >
                        <option value="sent">Sent (✓)</option>
                        <option value="delivered">Delivered (✓✓)</option>
                        <option value="read">Read (✓✓ Blue)</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-end gap-2">
              <button 
                type="button"
                onClick={() => setIsEditingModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSaveMessage}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold transition cursor-pointer shadow-lg shadow-sky-600/20"
              >
                {editingMessageId ? 'Update Message' : 'Add to Chat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
