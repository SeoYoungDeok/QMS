'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { authAPI } from '@/lib/api'

interface FormData {
  username: string
  password: string
  password_confirm: string
  name: string
  department: string
  position: string
  phone_number: string
}

interface FormErrors {
  [key: string]: string
}

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    username: '',
    password: '',
    password_confirm: '',
    name: '',
    department: '',
    position: '',
    phone_number: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [usernameChecking, setUsernameChecking] = useState(false)
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null)

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
    
    // 아이디 변경 시 중복 체크 상태 초기화
    if (name === 'username') {
      setUsernameAvailable(null)
    }
  }

  const checkUsername = async () => {
    if (!formData.username.trim()) {
      setErrors(prev => ({ ...prev, username: '아이디를 입력해주세요.' }))
      return
    }

    setUsernameChecking(true)
    try {
      const response = await authAPI.checkUsername(formData.username)
      const data = response.data as { available: boolean }
      setUsernameAvailable(data.available)
      if (!data.available) {
        setErrors(prev => ({ ...prev, username: '이미 사용 중인 아이디입니다.' }))
      }
    } catch (error) {
      setErrors(prev => ({ ...prev, username: '아이디 중복 체크에 실패했습니다.' }))
    } finally {
      setUsernameChecking(false)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // 필수 필드 검증
    if (!formData.username.trim()) newErrors.username = '아이디를 입력해주세요.'
    if (!formData.password) newErrors.password = '비밀번호를 입력해주세요.'
    if (!formData.password_confirm) newErrors.password_confirm = '비밀번호 확인을 입력해주세요.'
    if (!formData.name.trim()) newErrors.name = '이름을 입력해주세요.'
    if (!formData.department.trim()) newErrors.department = '부서를 입력해주세요.'
    if (!formData.position.trim()) newErrors.position = '직급을 입력해주세요.'
    if (!formData.phone_number.trim()) newErrors.phone_number = '핸드폰 번호를 입력해주세요.'

    // 비밀번호 정책 검증
    if (formData.password && formData.password.length < 8) {
      newErrors.password = '비밀번호는 최소 8자 이상이어야 합니다.'
    }

    // 비밀번호 확인
    if (formData.password && formData.password_confirm && formData.password !== formData.password_confirm) {
      newErrors.password_confirm = '비밀번호가 일치하지 않습니다.'
    }

    // 아이디 중복 체크 확인
    if (usernameAvailable === false) {
      newErrors.username = '이미 사용 중인 아이디입니다.'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setLoading(true)
    try {
      await authAPI.signup(formData)
      
      // 성공 시 로그인 페이지로 이동
      router.push('/login?message=signup_success')
    } catch (error: any) {
      if (error.response?.data) {
        const apiErrors = error.response.data
        const newErrors: FormErrors = {}
        
        for (const [field, messages] of Object.entries(apiErrors)) {
          if (Array.isArray(messages)) {
            newErrors[field] = messages[0]
          } else {
            newErrors[field] = messages as string
          }
        }
        
        setErrors(newErrors)
      } else {
        setErrors({ submit: '회원가입에 실패했습니다. 다시 시도해주세요.' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">회원가입</CardTitle>
          <p className="text-[var(--text-secondary)] mt-2">
            QMS 시스템 계정을 생성하세요
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 아이디 */}
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  label="아이디"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  error={errors.username}
                  required
                  placeholder="영문, 숫자 조합"
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={checkUsername}
                loading={usernameChecking}
                className="self-end h-10"
              >
                중복확인
              </Button>
            </div>
            
            {usernameAvailable === true && (
              <p className="text-sm text-[var(--success)] flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                사용 가능한 아이디입니다.
              </p>
            )}

            {/* 비밀번호 */}
            <Input
              label="비밀번호"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              required
              helper="최소 8자, 영문/숫자/특수문자 포함"
            />

            {/* 비밀번호 확인 */}
            <Input
              label="비밀번호 확인"
              name="password_confirm"
              type="password"
              value={formData.password_confirm}
              onChange={handleChange}
              error={errors.password_confirm}
              required
            />

            {/* 이름 */}
            <Input
              label="이름"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
              placeholder="실명을 입력하세요"
            />

            {/* 부서 */}
            <Input
              label="부서"
              name="department"
              value={formData.department}
              onChange={handleChange}
              error={errors.department}
              required
              placeholder="예: 품질관리부"
            />

            {/* 직급 */}
            <Input
              label="직급"
              name="position"
              value={formData.position}
              onChange={handleChange}
              error={errors.position}
              required
              placeholder="예: 대리"
            />

            {/* 핸드폰 번호 */}
            <Input
              label="핸드폰 번호"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              error={errors.phone_number}
              required
              placeholder="010-1234-5678"
            />

            {errors.submit && (
              <p className="text-sm text-[var(--danger)] text-center">{errors.submit}</p>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={loading}
              disabled={usernameAvailable === false}
            >
              가입하기
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="justify-center">
          <p className="text-sm text-[var(--text-secondary)]">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-[var(--accent-primary)] hover:underline">
              로그인
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
