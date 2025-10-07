'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'

interface FormData {
  username: string
  password: string
}

interface FormErrors {
  [key: string]: string
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { login, isAuthenticated } = useAuth()
  
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    // 이미 로그인된 사용자는 메인 페이지로 리다이렉트
    if (isAuthenticated) {
      router.push('/')
    }

    // 회원가입 성공 메시지 표시
    if (searchParams.get('message') === 'signup_success') {
      setSuccessMessage('회원가입이 완료되었습니다. 로그인해주세요.')
    }
  }, [isAuthenticated, router, searchParams])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // 에러 메시지 제거
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.username.trim()) {
      newErrors.username = '아이디를 입력해주세요.'
    }
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    setSuccessMessage('')
    
    try {
      await login(formData.username, formData.password)
      
      // 로그인 성공 시 메인 페이지로 이동
      router.push('/')
    } catch (error: any) {
      if (error.response?.data?.error) {
        // 백엔드에서 제공하는 구체적인 에러 메시지 사용
        setErrors({ submit: error.response.data.error })
      } else if (error.response?.status === 401) {
        setErrors({ submit: '아이디 또는 비밀번호가 올바르지 않습니다.' })
      } else {
        setErrors({ submit: '로그인에 실패했습니다. 다시 시도해주세요.' })
      }
    } finally {
      setLoading(false)
    }
  }

  if (isAuthenticated) {
    return null // 리다이렉트 중
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">로그인</CardTitle>
          <p className="text-[var(--text-secondary)] mt-2">
            QMS 시스템에 접속하세요
          </p>
        </CardHeader>
        
        <CardContent>
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-700 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {successMessage}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 아이디 */}
            <Input
              label="아이디"
              name="username"
              value={formData.username}
              onChange={handleChange}
              error={errors.username}
              required
              placeholder="아이디를 입력하세요"
              autoComplete="username"
            />

            {/* 비밀번호 */}
            <Input
              label="비밀번호"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
            />

            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.submit}
                </p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={loading}
            >
              로그인
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="justify-center">
          <p className="text-sm text-[var(--text-secondary)]">
            계정이 없으신가요?{' '}
            <Link href="/signup" className="text-[var(--accent-primary)] hover:underline">
              회원가입
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
