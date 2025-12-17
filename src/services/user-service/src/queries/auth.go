package queries

var (
	QueryInsertOtp = `
		insert into banking.one_time_passcodes (user_id, one_time_passcode_hash)
		select users.user_id, $2
		from banking.users
		where users.phone_number = $1
		on conflict (user_id) do update
				set one_time_passcode_hash = $2, expires = now() + ($3)::interval
		`

	QueryGetOtp = `
		with otp_expiry_update as (
				update banking.one_time_passcodes
						set expires = now()
						from banking.users
						where
								users.phone_number = $1
										and users.user_id = one_time_passcodes.user_id
										and one_time_passcodes.expires > now()
						returning one_time_passcode_hash, users.user_id as user_id),
				last_phone_verification_update AS (
						update banking.users
								set last_phone_verification = now()
								where phone_number = $1
										and user_id in (select user_id from otp_expiry_update)
								returning user_id)
		select *
		from otp_expiry_update
	`

	QueryInsertSession = `
		insert into banking.sessions (session_id, user_id, expires, device, application, ip_address)
		values ($1, $2, $3, $4, $5, $6)
	`

	QueryRefreshSession = `
		update banking.sessions
		set expires = $1
		where session_id = $2 AND expires > now()
	`

	QueryGetActiveSessions = `
		select session_id, expires, created_at, device, application, ip_address
		from banking.sessions
		where user_id = $1 and expires > now()
	`

	QueryInvalidateSession = `
		update banking.sessions
		set expires = now()
		where session_id = $1 and user_id = $2
	`
)
