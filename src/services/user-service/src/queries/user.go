package queries

var (
	QueryCreateUser = `
		INSERT INTO banking.users
		(user_id, phone_number, first_name, last_name, address, birth_date) 
		VALUES ($1,$2,$3,$4,$5,$6) 
		RETURNING user_id, phone_number, first_name, last_name, address, created_at, birth_date
	`

	QueryGetUserById = `
		select user_id, phone_number, first_name, last_name, address, created_at, birth_date
		from banking.users
		where user_id = $1
	`

	QueryGetUserByPhoneNumber = `
		select user_id, phone_number, first_name, last_name, address, created_at, birth_date
		from banking.users
		where phone_number = $1
	`
)
