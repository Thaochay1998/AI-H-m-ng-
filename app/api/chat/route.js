import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { messages, imageBase64 } = await req.json()
    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY
    const replicateToken = process.env.REPLICATE_API_TOKEN // Mã Replicate cho tính năng Pro

    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Thiếu GEMINI_API_KEY trên cấu hình Vercel / Netlify.' 
      }, { status: 500 })
    }

    const lastMessage = messages?.[messages.length - 1]?.content || ''
    const lowerMsg = lastMessage.toLowerCase()

    // =========================================================================
    // 1. TÍNH NĂNG TẠO VIDEO NHÉP MIỆNG AI (.MP4)
    // =========================================================================
    const isVideoRequest = ['tạo video', 'video', 'nhép miệng', 'làm video', 'cho nói'].some(kw => lowerMsg.includes(kw))

    if (isVideoRequest) {
      if (!replicateToken) {
        return NextResponse.json({
          result: `⚠️ **Tính năng Tạo Video Nhép Miệng yêu cầu Gói Pro (Replicate API Token)**.\n\nĐể kích hoạt:\n1. Đăng ký lấy API Token miễn phí tại \`replicate.com\`\n2. Thêm biến \`REPLICATE_API_TOKEN\` vào cài đặt Environment Variables trên Vercel/Netlify.`
        })
      }

      try {
        // Gọi Replicate LivePortrait Model
        const targetImage = imageBase64 || "https://replicate.delivery/pbxt/Kj1tG4r7sM1m/hmong_girl.jpg"
        
        const resReplicate = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Authorization": `Token ${replicateToken}`,
            "Content-Type": "application/json",
            "Prefer": "wait=30"
          },
          body: JSON.stringify({
            version: "307038f21783f9829b3a3c200632b7c7b80892b1580b06b299e5251a3b50c057",
            input: {
              source_image: targetImage,
              driving_video: "https://replicate.delivery/pbxt/Kj1tG/talking_demo.mp4"
            }
          })
        })

        const videoData = await resReplicate.json()
        const videoUrl = videoData.output || videoData.urls?.get

        if (videoUrl) {
          return NextResponse.json({
            result: `AI H’Mông đã tạo xong Video nhép miệng cho bạn:\n\n[Xem Video AI](${videoUrl})`
          })
        }
      } catch (err) {
        console.error("Lỗi Replicate Video:", err)
      }
    }

    // =========================================================================
    // 2. TÍNH NĂNG GHÉP MẶT GIỮ NÉT GỐC 100% (FACE-LOCK / INSTANTID)
    // =========================================================================
    const isFaceSwapRequest = ['ghép mặt', 'giữ mặt', 'giữ nét gốc', 'khóa mặt', 'thay trang phục gốc'].some(kw => lowerMsg.includes(kw))

    if (isFaceSwapRequest && imageBase64) {
      if (!replicateToken) {
        return NextResponse.json({
          result: `⚠️ **Tính năng Ghép Mặt Giữ Nét Gốc 100% yêu cầu Gói Pro (Replicate API Token)**.\n\nVui lòng gắn biến \`REPLICATE_API_TOKEN\` trên Vercel/Netlify để kích hoạt công nghệ xử lý GPU khóa khuôn mặt gốc.`
        })
      }

      try {
        // Gọi Replicate FaceSwap Model (Face-Lock)
        const resReplicate = await fetch("https://api.replicate.com/v1/predictions", {
          method: "POST",
          headers: {
            "Authorization": `Token ${replicateToken}`,
            "Content-Type": "application/json",
            "Prefer": "wait=30"
          },
          body: JSON.stringify({
            version: "9a49d1746355d115e640e1c312a4735232874e4028f804d4122d13b43c683b7f",
            input: {
              swap_image: imageBase64,
              target_image: "https://image.pollinations.ai/prompt/Hmong%20traditional%20clothing%20portrait?nologo=true"
            }
          })
        })

        const faceData = await resReplicate.json()
        const faceUrl = faceData.output

        if (faceUrl) {
          return NextResponse.json({
            result: `AI H’Mông đã ghép trang phục và giữ 100% khuôn mặt gốc thành công:\n\n![Ảnh Ghép Mặt Gốc](${faceUrl})`
          })
        }
      } catch (err) {
        console.error("Lỗi Replicate FaceSwap:", err)
      }
    }

    // =========================================================================
    // 3. TÍNH NĂNG VẼ ẢNH AI TỰ ĐỘNG (FLUX ENGINE - MIỄN PHÍ)
    // =========================================================================
    const imageKeywords = ['vẽ', 'tạo ảnh', 'hình ảnh', 'chụp ảnh', 'bức ảnh', 'draw', 'image', 'picture']
    const isImageRequest = imageKeywords.some(kw => lowerMsg.includes(kw))

    if (isImageRequest) {
      let promptText = lastMessage
        .replace(/tạo ảnh|vẽ giúp|vẽ cho|vẽ|chụp ảnh|bức ảnh|hình ảnh|cho tôi|giúp tôi/gi, '')
        .trim()
      
      if (!promptText) promptText = 'A beautiful Hmong girl wearing vibrant traditional clothing, 8k resolution portrait'

      const enhancedPrompt = `${promptText}, highly detailed, photorealistic, 8k resolution, cinematic lighting`
      const encodedPrompt = encodeURIComponent(enhancedPrompt)
      const randomSeed = Math.floor(Math.random() * 999999)
      
      const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&seed=${randomSeed}&nologo=true&model=flux`

      return NextResponse.json({
        result: `AI H’Mông đã vẽ xong bức ảnh cho bạn:\n\n![Ảnh AI H'Mông](${imageUrl})`
      })
    }

    // =========================================================================
    // 4. CHAT VĂN BẢN, GIẢI TOÁN, KỊCH BẢN & SOI ẢNH (GEMINI 1.5 FLASH)
    // =========================================================================
    const SYSTEM_PROMPT = `Bạn là "AI H’Mông" - Trợ lý AI toàn năng dành cho cộng đồng H’Mông và Việt Nam.
Nhiệm vụ: Trò chuyện, giải toán chi tiết, sáng tạo kịch bản video, dịch thuật Tiếng H'Mông (chữ RPA) và soi phân tích ảnh.`

    const contents = (messages || []).map((m, index) => {
      const isLast = index === messages.length - 1
      const role = m.role === 'assistant' ? 'model' : 'user'
      
      if (isLast && imageBase64 && role === 'user') {
        const mimeType = imageBase64.substring(imageBase64.indexOf(':') + 1, imageBase64.indexOf(';'))
        const base64Data = imageBase64.split(',')[1]
        return {
          role: 'user',
          parts: [
            { inlineData: { mimeType: mimeType, data: base64Data } },
            { text: m.content || 'Hãy phân tích chi tiết bức ảnh này.' }
          ]
        }
      }

      return { role, parts: [{ text: m.content || '' }] }
    })

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
      return NextResponse.json({ error: data.error?.message || 'Lỗi API Gemini' }, { status: response.status })
    }

    const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text || 'AI H’Mông chưa nhận được phản hồi.'
    return NextResponse.json({ result: aiContent })

  } catch (err) {
    return NextResponse.json({ error: 'Lỗi máy chủ: ' + err.message }, { status: 500 })
  }
}
