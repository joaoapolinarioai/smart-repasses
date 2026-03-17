import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, ShieldCheck, User, Store, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import '../styles/login.css'

export function LoginPage() {
    const [isRegistering, setIsRegistering] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [storeName, setStoreName] = useState('')
    const [loading, setLoading] = useState(false)
    const [isForgotPassword, setIsForgotPassword] = useState(false)

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            if (isForgotPassword) {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + '/reset-password',
                })
                if (error) throw error
                toast.success('E-mail de recuperação enviado!', {
                    description: 'Verifique sua caixa de entrada para redefinir sua senha.',
                    duration: 10000,
                })
                setIsForgotPassword(false)
            } else if (isRegistering) {
                if (password !== confirmPassword) {
                    throw new Error('As senhas não coincidem. Verifique e tente novamente.')
                }

                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                            store_name: storeName
                        }
                    }
                })
                if (error) throw error

                toast.success('Solicitação enviada!', {
                    description: 'Aguarde a aprovação do administrador para acessar o ecossistema.',
                    duration: 10000,
                })
                setIsRegistering(false)
                setConfirmPassword('')
            } else {
                const { error, data } = await supabase.auth.signInWithPassword({ email, password })
                if (error) {
                    if (error.message.includes('Invalid login credentials')) {
                        throw new Error('E-mail ou senha incorretos. Verifique suas credenciais.')
                    }
                    if (error.message.includes('Email not confirmed')) {
                        throw new Error('Confirmação pendente. Verifique seu e-mail ou contate o suporte.')
                    }
                    throw error
                }

                if (data.user) {
                    window.location.href = '/'
                }
            }
        } catch (error: any) {
            toast.error(error.message, {
                className: 'font-bold text-xs uppercase tracking-wider'
            })
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

                    <h1 className="login-title">
                        {isForgotPassword ? 'Recuperar Senha' : (isRegistering ? 'Criar Conta' : 'Entrar na Rede')}
                    </h1>
                    <p className="login-subtitle">
                        {isForgotPassword ? 'REDEFINIÇÃO DE ACESSO' : (isRegistering ? 'CADASTRO DE REVENDEDORES' : 'ACESSO EXCLUSIVO B2B')}
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <AnimatePresence mode="wait">
                        {isRegistering && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-5 mb-5"
                            >
                                <div className="login-input-group">
                                    <label className="login-label">Nome Completo</label>
                                    <div className="login-input-wrapper">
                                        <User className="login-icon" />
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            className="login-input"
                                            placeholder="Nome do responsável"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="login-input-group">
                                    <label className="login-label">Nome da Loja</label>
                                    <div className="login-input-wrapper">
                                        <Store className="login-icon" />
                                        <input
                                            type="text"
                                            value={storeName}
                                            onChange={(e) => setStoreName(e.target.value)}
                                            className="login-input"
                                            placeholder="Nome fantasia da revenda"
                                            required
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="login-input-group">
                        <label className="login-label">Email Corporativo</label>
                        <div className="login-input-wrapper">
                            <Mail className="login-icon" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="login-input"
                                placeholder="ex: seu@email.com.br"
                                required
                            />
                        </div>
                    </div>

                    {!isForgotPassword && (
                        <div className="login-input-group">
                            <label className="login-label">Senha de Acesso</label>
                            <div className="login-input-wrapper">
                                <Lock className="login-icon" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="login-input"
                                    placeholder="••••••••"
                                    required
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
                    )}

                    {!isRegistering && !isForgotPassword && (
                        <span 
                            className="login-forgot-password"
                            onClick={() => setIsForgotPassword(true)}
                        >
                            Esqueci minha senha
                        </span>
                    )}

                    <AnimatePresence>
                        {isRegistering && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="login-input-group mt-5"
                            >
                                <label className="login-label">Confirmar Senha</label>
                                <div className="login-input-wrapper">
                                    <Lock className="login-icon" />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="login-input"
                                        placeholder="Confirme sua senha"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="login-eye-button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                {isForgotPassword ? 'Recuperar Acesso' : (isRegistering ? 'Solicitar Cadastro' : 'Entrar no Ecossistema')}
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                <div className="text-center mt-6">
                    <p className="login-toggle">
                        {isForgotPassword ? (
                            <>
                                Lembrou sua senha? {' '}
                                <span onClick={() => setIsForgotPassword(false)}>
                                    Clique aqui para login
                                </span>
                            </>
                        ) : (
                            <>
                                {isRegistering ? 'Já faz parte da rede?' : 'Ainda não é cadastrado?'} {' '}
                                <span onClick={() => {
                                    setIsRegistering(!isRegistering);
                                    setIsForgotPassword(false);
                                }}>
                                    {isRegistering ? 'Clique aqui para entrar' : 'Solicite acesso agora'}
                                </span>
                            </>
                        )}
                    </p>
                </div>

                <div className="login-footer">
                    <div className="flex items-center justify-center gap-2 mb-4 opacity-100">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A1A1AA]">Conexão Segura</span>
                    </div>
                    <p className="login-footer-text">
                        © 2024 <span className="login-footer-highlight font-black">SMART REPASSES</span>. PLATAFORMA EXCLUSIVA B2B. PROIBIDA CÓPIA OU REPRODUÇÃO NÃO AUTORIZADA.
                    </p>
                </div>
            </motion.div>
        </div>
    )
}
