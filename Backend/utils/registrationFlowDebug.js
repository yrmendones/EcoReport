module.exports = function registrationFlowDebugEnabled() {
    return /^(1|true)$/i.test(String(process.env.REGISTRATION_FLOW_DEBUG || '').trim());
};
