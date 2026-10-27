const supabase = require('../config/supabase');

async function authenticateUser(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Authentication token is required.'
            });
        }

        const token = authHeader.split(' ')[1];

        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data.user) {
            return res.status(401).json({
                message: 'Invalid or expired authentication token.'
            });
        }

        const { data: applicationUser, error: userError } = await supabase
            .from('users')
            .select('user_id, username, role, status')
            .eq('auth_user_id', data.user.id)
            .single();

        if (userError || !applicationUser) {
            console.error('Application user lookup error:', userError);

            return res.status(404).json({
                message: 'Application user record not found.'
            });
        }


       if (
            typeof applicationUser.status !== 'string' ||
            applicationUser.status.trim().toLowerCase() !== 'active'
        ) {
        return res.status(403).json({
        message: 'User account is not active.'
        });
    }
        req.user = {
            ...data.user,
            user_id: applicationUser.user_id,
            username: applicationUser.username,
            role: applicationUser.role,
            status: applicationUser.status
        };

        next();

    } catch (error) {
        console.error('Authentication error:', error);

        return res.status(500).json({
            message: 'Authentication failed.'
        });
    }
}

module.exports = authenticateUser;