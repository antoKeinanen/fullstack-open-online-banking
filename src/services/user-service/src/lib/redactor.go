package lib

func RedactPhoneNumber(phoneNumber string) string {
	if len(phoneNumber) <= 4 {
		return phoneNumber
	}
	redacted := ""
	for i := 0; i < len(phoneNumber)-4; i++ {
		if phoneNumber[i] == ' ' || phoneNumber[i] == '-' || phoneNumber[i] == '+' {
			redacted += string(phoneNumber[i])
		} else {
			redacted += "*"
		}
	}
	return redacted + phoneNumber[len(phoneNumber)-4:]
}

func RedactJWT(jwt string) string {
	if len(jwt) <= 10 {
		return "***"
	}
	return jwt[:5] + "..." + jwt[len(jwt)-5:]
}
