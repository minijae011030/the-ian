import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/the-ian/',
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      // 방문자용 뷰어(index)와 방꾸 에디터(admin)를 따로 빌드 → 뷰어는 에디터 코드를 안 받음
      input: {
        main: 'index.html',
        admin: 'admin.html',
      },
    },
  },
})
