import { motion } from 'framer-motion'

export default function PageContainer({ children, title, subtitle, action }) {
    return (
        <div className="min-h-screen relative bg-off-white">
            {/* Subtle background gradient */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-teal/5 to-transparent rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {(title || subtitle || action) && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8"
                    >
                        <div>
                            {title && (
                                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                                    {title}
                                </h1>
                            )}
                            {subtitle && (
                                <p className="mt-2 text-gray-600">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        {action && (
                            <div className="mt-4 sm:mt-0">
                                {action}
                            </div>
                        )}
                    </motion.div>
                )}
                <motion.main
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    {children}
                </motion.main>
            </div>
        </div>
    )
}
