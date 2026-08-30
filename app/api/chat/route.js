import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { messages, imageBase64 } = await req.json()
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY
    const replicateToken = process.env.REPLICATE_API_TOKEN // Mã dự phòng cho tính năng Pro ghép mặt/video

    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Thiếu GEMINI_API_KEY trên cấu hình Vercel / Netlify. Vui lòng kiểm tra lại Environment Variables.' 
      }, { status: 500 })
    }

    const lastMessage = messages?.[messages.length - 1]?.content || ''
    const lowerMsg = lastMessage.toLowerCase()

    // =========================================================================
    // 1. NHẬN DIỆN CÂU LỆNH VẼ / TẠO ẢNH / THAY TRANG PHỤC / GHÉP CẢNH
    // =========================================================================
    const imageKeywords = ['vẽ', 'tạo ảnh', 'hình ảnh', 'chụp ảnh', 'bức ảnh', 'thay trang phục', 'ghép cảnh', 'đổi bối cảnh', 'draw', 'image', 'picture']
    const isImageRequest = imageKeywords.some(kw => lowerMsg.includes(kw))

    if (isImageRequest) {
      // Xử lý làm sạch câu lệnh prompt
      let promptText = lastMessage
        .replace(/tạo ảnh|vẽ giúp|vẽ cho|vẽ|chụp ảnh|bức ảnh|hình ảnh|cho tôi|giúp tôi|thay trang phục|ghép cảnh|đổi bối cảnh/gi, '')
        .trim()
      
      if (!promptText) {
        promptText = 'A beautiful Hmong girl wearing vibrant traditional colorful embroidery clothing, wearing silver headpiece, photorealistic portrait'
      }

      // Xử lý vẽ ảnh AI chất lượng cao bằng Flux Engine (Miễn phí 100%)
      const enhancedPrompt = `${promptText}, highly detailed, photorealistic, 8k resolution, cinematic lighting, masterpiece`
      const encodedPrompt = encodeURIComponent(enhancedPrompt)
      const randomSeed = Math.floor(Math.random() * 999999)
      
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${randomSeed}&nologo=true&model=flux`

      return NextResponse.json({
        result: `AI H’Mông đã thiết kế xong bức ảnh theo yêu cầu của bạn:\n\n![Ảnh AI H'Mông](${imageUrl})\n\n💡 *Mẹo: Bạn có thể mô tả chi tiết hơn như "Vẽ cô gái H'Mông đứng bên ruộng bậc thang Sapa" để tạo ra bức ảnh độc đáo hơn nhé!*`
      })
    }

    // =========================================================================
    // 2. XỬ LÝ VĂN BẢN (GIẢI TOÁN, VIẾT KỊCH BẢN, DỊCH THUẬT & SOI ẢNH VISION)
    // =========================================================================
    const SYSTEM_PROMPT = `Bạn là "AI H’Mông" - Trợ lý Trí tuệ Nhân tạo thông minh, toàn năng dành riêng cho cộng đồng H’Mông và Việt Nam.

Nhiệm vụ trọng tâm của bạn:
1. TRÒ CHUYỆN & DỊCH THUẬT: Thành thạo Tiếng Việt và Tiếng H’Mông (chữ RPA). Trả lời thân thiện, lịch sự, đúng bản sắc văn hóa.
2. GIẢI TOÁN & HỌC TẬP: Giải chi tiết bài tập, toán học, đề thi từng bước (step-by-step) rõ ràng, dễ hiểu.
3. SÁNG TẠO NỘI DUNG: Viết kịch bản video TikTok, Facebook Reels, YouTube, bài viết bán hàng, tư vấn chiến lược.
4. SOI & PHÂN TÍCH ẢNH (VISION): Khi người dùng tải ảnh lên, hãy phân tích chi tiết khuôn mặt, trang phục, bài toán hoặc đọc chữ (OCR) trong ảnh.`

    // Đóng gói lịch sử tin nhắn truyền cho Gemini API
    const contents = (messages || []).map((m, index) => {
      const isLast = index === messages.length - 1
      const role = m.role === 'assistant' ? 'model' : 'user'
      
      // Nếu câu cuối có đính kèm file ảnh Base64 từ nút 📷
      if (isLast && imageBase64 && role === 'user') {
        const mimeType = imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';'))
        const base64Data = imageBase64.split(',')[1]
        return {
          role: 'user',
          parts: [
            { inlineData: { mimeType: mimeType, data: base64Data } },
            { text: m.content || 'Hãy phân tích chi tiết bức ảnh này giúp tôi.' }
          ]
        }
      }

      return { role, parts: [{ text: m.content || '' }] }
    })

    // Gọi API Gemini 1.5 Flash
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: contents
        })
      }
    )

    const data = await response.json()
    
    if (!response.ok) {
      console.error("Lỗi Gemini API:", data)
      return NextResponse.json({ 
        error: data.error?.message || 'Lỗi kết nối từ API Gemini.' 
      }, { status: response.status })
    }

    const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text || 'AI H’Mông chưa nhận được phản hồi. Vui lòng thử lại.'
    
    return NextResponse.json({ result: aiContent })

  } catch (err) {
    console.error("Lỗi Server:", err)
    return NextResponse.json({ error: 'Lỗi máy chủ nội bộ: ' + err.message }, { status: 500 })
  }
}
