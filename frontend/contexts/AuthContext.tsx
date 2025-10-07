'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, authAPI } from '@/lib/api'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  hasRole: (minRoleLevel: number) => boolean
  setUser: (user: User | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 페이지 로드 시 로컬 스토리지에서 사용자 정보 복원
    const initAuth = () => {
      try {
        const token = localStorage.getItem('access_token')
        const userData = localStorage.getItem('user')
        
        if (token && userData) {
          setUser(JSON.parse(userData))
        }
      } catch (error) {
        console.error('인증 정보 로드 실패:', error)
        authAPI.logout()
      } finally {
        setLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (username: string, password: string) => {
    try {
      const response = await authAPI.login({ username, password })
      const { token, refresh, user: userData } = response.data
      
      // 토큰과 사용자 정보 저장
      localStorage.setItem('access_token', token)
      localStorage.setItem('refresh_token', refresh)
      localStorage.setItem('user', JSON.stringify(userData))
      
      setUser(userData)
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    authAPI.logout()
    setUser(null)
  }

  const hasRole = (minRoleLevel: number) => {
    return user ? user.role_level >= minRoleLevel : false
  }

  const updateUser = (userData: User | null) => {
    setUser(userData)
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData))
    } else {
      localStorage.removeItem('user')
    }
  }

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    hasRole,
    setUser: updateUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
