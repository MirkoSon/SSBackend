/**
 * Migration 000003: Epic 4 Economy Plugin Tables
 *
 * NOTE: As of Story 2.3, economy plugin tables are now managed by the plugin's own migrations.
 * This migration is kept for backward compatibility but does nothing.
 * The actual table creation happens in: plugins/@core/economy/migrations/000001_initial_schema.js
 */

module.exports = {
  version: 3,
  name: 'epic4_economy',
  description: 'Economy plugin tables (now managed by plugin migrations)',

  /**
   * Apply migration
   * No-op: Tables are created by plugin migrations
   */
  async up(db) {
    console.log('  ℹ️  Economy tables are now managed by plugin migrations');
    return Promise.resolve();
  },

  /**
   * Rollback migration
   * No-op: Tables are managed by plugin migrations
   */
  async down(db) {
    console.log('  ℹ️  Economy tables rollback handled by plugin migrations');
    return Promise.resolve();
  }
};
