'use client'
import { useState, useEffect, useRef } from 'react'

export default function Home() {
  const [chats, setChats] = useState([])
  const [currentChatId, setCurrentChatId] = useState(null)
  const [input, setInput] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('hmong_ai_sessions')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChats(parsed)
          setCurrentChatId(parsed[0].id)
          return
        }
      } catch (e) {
        console.error("Lỗi đọc lịch sử:", e)
      }
    }
    createNewChat()
  }, [])

  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('hmong_ai_sessions', JSON.stringify(chats))
    }
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chats, currentChatId])

  const currentChat = chats.find(c => c.id === currentChatId) || chats[0]

  const createNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      title: 'Cuộc trò chuyện mới',
      messages: [
        {
          role: 'assistant',
          content: 'Pob tsawg! Tôi là AI H’Mông Toàn Năng.\n\n• Chat, Dịch thuật, Giải toán & Viết kịch bản.\n• Bấm 📷 tải ảnh lên: Soi ảnh, gõ "ghép mặt giữ nét gốc" hoặc "tạo video nhép miệng".\n• Bấm 🔊 Giọng Nam / Giọng Nữ bên dưới để nghe file âm thanh chuẩn H’Mông đã tích hợp sẵn!'
        }
      ]
    }
    setChats(prev => [newChat, ...prev])
    setCurrentChatId(newChat.id)
    setSidebarOpen(false)
  }

  const deleteChat = (id, e) => {
    e.stopPropagation()
    const updated = chats.filter(c => c.id !== id)
    if (updated.length === 0) {
      localStorage.removeItem('hmong_ai_sessions')
      createNewChat()
    } else {
      setChats(updated)
      if (currentChatId === id) setCurrentChatId(updated[0].id)
    }
  }

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setSelectedImage(reader.result)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  // TÍCH HỢP ĐỌC FILE ÂM THANH THỦ CÔNG CHUẨN GIỌNG (NAM / NỮ)
  const playAudio = (gender) => {
    if (isPlayingAudio) return

    const fileName = gender === 'nu' ? '/audio/thuyet-trinh-nu.mp3' : '/audio/thuyet-trinh-nam.mp3'
    setIsPlayingAudio(true)

    const audio = new Audio(fileName)
    audio.play().then(() => {
      audio.onended = () => setIsPlayingAudio(false)
      audio.onerror = () => {
        setIsPlayingAudio(false)
        alert('Không tìm thấy file âm thanh hoặc lỗi phát file.')
      }
    }).catch(() => {
      setIsPlayingAudio(false)
      alert('Trình duyệt chặn phát âm thanh tự động hoặc lỗi tệp.')
    })
  }

  const sendMessage = async (e) => {
    e?.preventDefault()
    if ((!input.trim() && !selectedImage) || loading || !currentChat) return

    const userText = input || (selectedImage ? 'Phân tích bức ảnh này giúp tôi' : '')
    const imageToSend = selectedImage
    setInput('')
    setSelectedImage(null)

    const userMsgContent = imageToSend 
      ? `![Ảnh tải lên](${imageToSend})\n\n${userText}`
      : userText

    const updatedMessages = [...currentChat.messages, { role: 'user', content: userMsgContent }]
    
    let newTitle = currentChat.title
    if (currentChat.messages.length <= 1) {
      newTitle = userText.length > 20 ? userText.substring(0, 20) + '...' : userText
    }

    setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, title: newTitle, messages: updatedMessages } : c))
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages, imageBase64: imageToSend })
      })

      const data = await res.json()
      const aiReply = res.ok ? data.result : ('⚠️ Lỗi: ' + (data.error || 'Không thể kết nối.'))

      setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: [...updatedMessages, { role: 'assistant', content: aiReply }] } : c))
    } catch (err) {
      setChats(prev => prev.map(c => c.id === currentChatId ? { ...c, messages: [...updatedMessages, { role: 'assistant', content: '⚠️ Lỗi máy chủ.' }] } : c))
    } finally {
      setLoading(false)
    }
  }

  const renderMessageContent = (content) => {
    if (!content) return ''
    
    const videoRegex = /\[(.*?Video.*?)\]\((https?:\/\/.*?\.(?:mp4|webm|mov).*?)\)/gi
    const imgRegex = /!\[.*?\]\((https?:\/\/.*?|data:image\/.*?)\)/g
    
    if (videoRegex.test(content)) {
      videoRegex.lastIndex = 0
      const match = videoRegex.exec(content)
      if (match) {
        return (
          <div className="space-y-2">
            <p className="text-sm">{content.replace(match[0], '').trim()}</p>
            <div className="my-2 rounded-xl overflow-hidden shadow-lg border border-slate-700 bg-black">
              <video src={match[2]} controls autoPlay loop className="w-full max-w-md rounded-xl" />
            </div>
          </div>
        )
      }
    }

    const parts = []
    let lastIndex = 0
    let match

    while ((match = imgRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index))
      }
      parts.push(
        <div key={match[1] + match.index} className="my-2">
          <img src={match[1]} alt="Media" className="rounded-xl w-full max-w-md shadow-lg border border-slate-700" />
        </div>
      )
      lastIndex = imgRegex.lastIndex
    }
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex))
    }
    return parts.length > 0 ? parts : content
  }

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-100 font-sans overflow-hidden">
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#1e293b] border-r border-slate-800 flex flex-col transition-transform duration-300 md:static md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-3">
          <button onClick={createNewChat} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-sm font-medium transition text-emerald-400 bg-slate-900/50">
            <span className="text-xl font-bold">+</span>
            <span>Đoạn chat mới</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {chats.map(chat => (
            <div key={chat.id} onClick={() => { setCurrentChatId(chat.id); setSidebarOpen(false); }} className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer transition ${chat.id === currentChatId ? 'bg-slate-800 text-white font-medium border-l-2 border-emerald-500' : 'text-slate-400 hover:bg-slate-800/50'}`}>
              <span className="truncate flex-1">💬 {chat.title}</span>
              <button onClick={(e) => deleteChat(chat.id, e)} className="text-slate-500 hover:text-red-400 px-1.5 py-0.5 rounded text-xs transition">✕</button>
            </div>
          ))}
        </div>
      </aside>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="fixed inset-0 bg-black/60 z-40 md:hidden" />}

      <div className="flex-1 flex flex-col h-full relative bg-[#0f172a]">
        <header className="flex items-center justify-between p-3.5 bg-[#1e293b] border-b border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-1.5 rounded-lg bg-slate-800 text-slate-300">☰</button>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-500 via-emerald-400 to-teal-300 p-0.5 shadow-md">
                <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-base">👧🏻</div>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-wide bg-gradient-to-r from-emerald-400 to-teal-200 bg-clip-text text-transparent">AI H’Mông</span>
                <span className="text-[10px] text-emerald-400/80 font-medium -mt-1">Trợ lý Trí Tuệ Nhân Tạo Pro</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* NÚT PHÁT NHANH GIỌNG NAM / NỮ THỦ CÔNG */}
            <button onClick={() => playAudio('nam')} disabled={isPlayingAudio} className="text-xs bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 px-2.5 py-1.5 rounded-lg font-medium hover:bg-emerald-600/40 transition flex items-center gap-1 shadow-sm cursor-pointer">
              <span>🔊</span>
              <span>{isPlayingAudio ? 'Đang phát...' : 'Giọng Nam'}</span>
            </button>
            <button onClick={() => playAudio('nu')} disabled={isPlayingAudio} className="text-xs bg-teal-600/30 border border-teal-500/50 text-teal-300 px-2.5 py-1.5 rounded-lg font-medium hover:bg-teal-600/40 transition flex items-center gap-1 shadow-sm cursor-pointer">
              <span>🔊</span>
              <span>{isPlayingAudio ? 'Đang phát...' : 'Giọng Nữ'}</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 space-y-4 max-w-3xl w-full mx-auto">
          {currentChat?.messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap relative ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none shadow-md' : 'bg-[#1e293b] text-slate-100 border border-slate-700/60 rounded-tl-none shadow-md'}`}>
                {renderMessageContent(msg.content)}
                
                {msg.role === 'assistant' && (
                  <div className="mt-2 pt-2 border-t border-slate-700/40 flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <button onClick={() => playAudio('nam')} disabled={isPlayingAudio} className="text-emerald-400 hover:text-emerald-300 font-medium transition cursor-pointer">
                        <span>🔊 Giọng Nam</span>
                      </button>
                      <span className="text-slate-600">|</span>
                      <button onClick={() => playAudio('nu')} disabled={isPlayingAudio} className="text-teal-400 hover:text-teal-300 font-medium transition cursor-pointer">
                        <span>🔊 Giọng Nữ</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#1e293b] px-4 py-3 rounded-2xl text-xs text-slate-400 animate-pulse border border-slate-700/50 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                AI H’Mông đang xử lý dữ liệu...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        <footer className="p-3 bg-[#1e293b] border-t border-slate-800">
          {selectedImage && (
            <div className="max-w-3xl mx-auto mb-2 flex items-center gap-2 bg-[#0f172a] p-2 rounded-xl border border-slate-700">
              <img src={selectedImage} alt="Preview" className="w-12 h-12 object-cover rounded-lg" />
              <span className="text-xs text-emerald-400 flex-1">Đã chọn ảnh! Gõ nội dung để xử lý.</span>
              <button onClick={() => setSelectedImage(null)} className="text-xs text-red-400 px-2 cursor-pointer">Xóa</button>
            </div>
          )}
          <form onSubmit={sendMessage} className="max-w-3xl mx-auto flex gap-2">
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-[#0f172a] border border-slate-700 px-3.5 py-3 rounded-xl text-lg hover:bg-slate-800 transition cursor-pointer">📷</button>
            <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Nhập câu hỏi hoặc yêu cầu..." className="flex-1 bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 transition" />
            <button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-3 rounded-xl font-medium text-sm transition shadow-md cursor-pointer">Gửi</button>
          </form>
        </footer>
      </div>
    </div>
  )
}
