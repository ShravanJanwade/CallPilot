export default function PageContainer({ children, title, subtitle, action }) {
    return (
        <div className="min-h-screen bg-off-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {(title || subtitle || action) && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                        <div>
                            {title && (
                                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900">
                                    {title}
                                </h1>
                            )}
                            {subtitle && (
                                <p className="mt-1 text-sm text-gray-500">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        {action && (
                            <div className="mt-4 sm:mt-0">
                                {action}
                            </div>
                        )}
                    </div>
                )}
                <main className="animate-fade-in">
                    {children}
                </main>
            </div>
        </div>
    )
}
