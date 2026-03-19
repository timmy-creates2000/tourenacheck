-- ============================================================
-- ADD TOURNAMENT GROUP INTEGRATION
-- Run this to add tournament-group linking without resetting
-- ============================================================

-- Add tournament_id to groups table (for tournament-specific groups)
ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS tournament_id uuid REFERENCES public.tournaments(id) ON DELETE CASCADE;

-- Add group_id to tournaments table (for auto-created group chat)
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.groups(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_groups_tournament_id ON public.groups(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_group_id ON public.tournaments(group_id);

-- Note: The circular reference is intentional and safe:
-- - tournaments.group_id references groups (SET NULL on delete)
-- - groups.tournament_id references tournaments (CASCADE on delete)
-- This allows tournaments to have auto-created groups, and groups can be tournament-specific

COMMENT ON COLUMN public.groups.tournament_id IS 'If set, this group is the official chat for a tournament';
COMMENT ON COLUMN public.tournaments.group_id IS 'Auto-created group chat for tournament participants';
