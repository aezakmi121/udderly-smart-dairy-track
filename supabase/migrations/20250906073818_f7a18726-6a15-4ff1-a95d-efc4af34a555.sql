-- Performance optimization: Add missing indexes based on performance advisor warnings

-- Fix user_roles table sequential scan issue - high volume lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_role ON public.user_roles USING btree (user_id, role);

-- Optimize calves queries by mother cow and status
CREATE INDEX IF NOT EXISTS idx_calves_mother_status ON public.calves USING btree (mother_cow_id, status);
CREATE INDEX IF NOT EXISTS idx_calves_status_birth_date ON public.calves USING btree (status, date_of_birth DESC);

-- Optimize AI records by cow_id and status for better queries
CREATE INDEX IF NOT EXISTS idx_ai_records_cow_status ON public.ai_records USING btree (cow_id, ai_status);
CREATE INDEX IF NOT EXISTS idx_ai_records_pd_date ON public.ai_records USING btree (pd_date) WHERE pd_date IS NOT NULL;

-- Optimize cows table for common queries
CREATE INDEX IF NOT EXISTS idx_cows_status_active ON public.cows USING btree (status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_cows_milking_move ON public.cows USING btree (needs_milking_move, needs_milking_move_at) WHERE needs_milking_move = true;

-- Optimize notification_history for better user queries
CREATE INDEX IF NOT EXISTS idx_notification_history_user_status ON public.notification_history USING btree (user_id, status, created_at DESC);

-- Optimize weight_logs for cow queries
CREATE INDEX IF NOT EXISTS idx_weight_logs_cow_date ON public.weight_logs USING btree (cow_id, log_date DESC);

-- Optimize vaccination_records for scheduling queries
CREATE INDEX IF NOT EXISTS idx_vaccination_records_cow_next_due ON public.vaccination_records USING btree (cow_id, next_due_date);
CREATE INDEX IF NOT EXISTS idx_vaccination_records_next_due_date ON public.vaccination_records USING btree (next_due_date) WHERE next_due_date >= CURRENT_DATE;