export interface VerificationResult {
    isValid: boolean;
    issues: string[];
    confidence: number;
}

export class DocumentVerifier {
    static async verify(file: File): Promise<VerificationResult> {
        return new Promise((resolve) => {
            setTimeout(() => {
                const issues: string[] = [];
                let isValid = true;
                let confidence = 0.95;

                // Mock basic checks
                if (file.size > 5 * 1024 * 1024) {
                    issues.push("File too large (max 5MB)");
                    isValid = false;
                }

                if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
                    issues.push("Invalid file format (use JPG, PNG, PDF)");
                    isValid = false;
                }

                // Randomly simulate a blur check
                if (Math.random() > 0.8) {
                    issues.push("Image appears blurry. Please retake.");
                    isValid = false;
                    confidence = 0.6;
                }

                resolve({ isValid, issues, confidence });
            }, 2000);
        });
    }
}
