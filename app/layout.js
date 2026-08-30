export const metadata = {
  title: "AI H'Mông",
  description: "Trợ lý Trí tuệ Nhân tạo H'Mông",
}

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <script src="https://cdn.tailwindcss.com"></script>
      </head>
      <body className="bg-[#0f172a] text-slate-100">{children}</body>
    </html>
  )
}
