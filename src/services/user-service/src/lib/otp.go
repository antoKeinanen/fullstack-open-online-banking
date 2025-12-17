package lib

import (
	"crypto/rand"
	"math/big"
	"strings"
)

func GenerateOTPCode() (string, error) {
	var otpCode strings.Builder
	for range OTPLength {
		num, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", err
		}
		otpCode.WriteString(num.String())
	}

	return otpCode.String(), nil
}
