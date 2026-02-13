export const getPaymentConfig = (req, res) => {
    try {
        // In a real production environment, these would come from process.env or a secured database
        // For now, we are simulating the "secure source" which is not exposed in the client bundle code directly
        const paymentConfig = {
            upiId: "boism-8839446381@boi",
            payeeName: "AKHIL BHARAT HINDU MAHASABHA",
            phoneNumber: "8839446381",
            bankName: "Bank of India",
            minAmount: "10.00",
            currency: "INR"
        };

        res.status(200).json({
            success: true,
            data: paymentConfig
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Failed to fetch payment configuration",
            error: error.message
        });
    }
};
