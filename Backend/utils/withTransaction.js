async function withTransaction(db, callback) {
    const connection = await db.getConnection();
    let transactionStarted = false;

    try {
        await connection.beginTransaction();
        transactionStarted = true;
        const result = await callback(connection);
        await connection.commit();
        transactionStarted = false;
        return result;
    } catch (error) {
        if (transactionStarted) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                error.rollbackError = rollbackError;
            }
        }
        throw error;
    } finally {
        connection.release();
    }
}

module.exports = withTransaction;
