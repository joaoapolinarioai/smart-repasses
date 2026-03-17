import { useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, ArrowRight, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import '../styles/login.css'

export function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        if (password !== confirmPassword) {
            toast.error('As senhas não coincidem.')
            return
        }

        setLoading(true)

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            if (error) throw error

            toast.success('Senha atualizada com sucesso!', {
                description: 'Você já pode acessar sua conta com a nova senha.'
            })
            
            // Redirect to login after a short delay
            setTimeout(() => {
                window.location.href = '/'
            }, 2000)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="login-container">
            <div className="login-bg-decoration" />

            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="login-card"
            >
                <div className="text-center">
                    <div className="login-logo-container">
                        <img src="/assets/icon-sr.svg" alt="Smart Repasses Icon" className="login-logo" />
                    </div>

                    <h1 className="login-title">Nova Senha</h1>
                    <p className="login-subtitle">REDEFINA SEU ACESSO</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="login-input-group">
                        <label className="login-label">Nova Senha</label>
                        <div className="login-input-wrapper">
                            <Lock className="login-icon" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="login-input"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                className="login-eye-button"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="login-input-group">
                        <label className="login-label">Confirmar Nova Senha</label>
                        <div className="login-input-wrapper">
                            <Lock className="login-icon" />
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="login-input"
                                placeholder="••••••••"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                className="login-eye-button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                Atualizar Senha
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                <div className="login-footer">
                    <div className="flex items-center justify-center gap-2 mb-4 opacity-100">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A1A1AA]">Conexão Segura</span>
                    </div>
                    <p className="login-footer-text">
                        © 2024 <span className="login-footer-highlight font-black">SMART REPASSES</span>. PLATAFORMA EXCLUSIVA B2B.
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
