function requireRole(...allowedRoles) {
    return (req, res, next) => {

        console.log('User role:', req.user?.role);
        console.log('Allowed roles:', allowedRoles);

        if (!req.user || !req.user.role) {
            return res.status(403).json({
                message: 'User role is required.'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                message: 'You do not have permission to access this resource.'
            });
        }

        next();
    };
}

module.exports = requireRole;