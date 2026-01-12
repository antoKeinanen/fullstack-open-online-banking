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

	QueryMapUserIdsToNames = `
		select first_name, last_name, user_id from banking.users
		where user_id = any($1)
	`

	QueryGetSuggestedUsers = `
		SELECT 
			other_user.user_id,
			other_user.phone_number,
			other_user.first_name,
			other_user.last_name
		FROM banking.transfers transfer
		JOIN banking.users from_user ON transfer.from_user_id = from_user.user_id
		JOIN banking.users to_user ON transfer.to_user_id = to_user.user_id
		JOIN banking.users other_user ON other_user.user_id = 
			CASE WHEN transfer.from_user_id = $1 THEN transfer.to_user_id 
				 ELSE transfer.from_user_id END
		WHERE (transfer.from_user_id = $1 OR transfer.to_user_id = $1)
		ORDER BY transfer.created_at DESC
		LIMIT $2
	`
)
