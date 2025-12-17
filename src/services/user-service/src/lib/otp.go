package lib

import (
	"crypto/rand"
	"math/big"
)

func GenerateOTPCode() (string, error) {
	otpCode := ""
	for range OTPLength {
		num, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", err
		}
		otpCode += num.String()
	}

	return otpCode, nil
}
