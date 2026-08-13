-- FriendZone Custom PostgreSQL Constraints & Partial Indexes Migration

-- 1. Canonical Friendship Constraint (user_id_1 MUST be strictly smaller than user_id_2)
-- Automatically prevents self-friendships (user_id_1 = user_id_2) since x < x is FALSE.
ALTER TABLE friendships 
  ADD CONSTRAINT chk_friendship_canonical CHECK (user_id_1 < user_id_2);

-- 2. Self-Block Prevention Constraint (blocker_id cannot equal blocked_id)
ALTER TABLE blocks 
  ADD CONSTRAINT chk_block_no_self CHECK (blocker_id <> blocked_id);

-- 3. PostgreSQL Partial Unique Index for Active Account Emails
-- Allows soft-deleted accounts to release their email for reuse while guaranteeing uniqueness among active users.
CREATE UNIQUE INDEX uk_users_active_email 
  ON users (email) 
  WHERE deleted_at IS NULL;

-- 4. Conversation Type vs Canonical Pair Constraint
-- Enforces that DIRECT conversations MUST have a canonical_pair, and GROUP conversations MUST NOT.
ALTER TABLE conversations 
  ADD CONSTRAINT chk_conv_type_canonical_pair CHECK (
    (type = 'DIRECT' AND canonical_pair IS NOT NULL) OR 
    (type = 'GROUP' AND canonical_pair IS NULL)
  );
