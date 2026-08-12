const store = {
    otp: new Map(),
    teamCardCouters: new Map(),
}

// Evict expired OTP entries every 5 minutes
const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [email, data] of store.otp.entries()) {
        if (data && data.expiresAt < now) {
            store.otp.delete(email);
        }
    }
}, 5 * 60 * 1000);

if (cleanupInterval && typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
}

export default store