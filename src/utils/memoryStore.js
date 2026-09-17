const store = {
    otp: new Map(),
    careerOtp: new Map(),
    verifiedCareerTokens: new Map(),
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
    for (const [email, data] of store.careerOtp.entries()) {
        if (data && data.expiresAt < now) {
            store.careerOtp.delete(email);
        }
    }
    for (const [token, data] of store.verifiedCareerTokens.entries()) {
        if (data && data.expiresAt < now) {
            store.verifiedCareerTokens.delete(token);
        }
    }
}, 5 * 60 * 1000);

if (cleanupInterval && typeof cleanupInterval.unref === 'function') {
    cleanupInterval.unref();
}

export default store