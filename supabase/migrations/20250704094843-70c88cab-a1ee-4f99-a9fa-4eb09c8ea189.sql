
-- Add missing foreign key constraints for better data integrity
ALTER TABLE ai_records 
ADD CONSTRAINT fk_ai_records_cow_id 
FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE CASCADE;

ALTER TABLE ai_records 
ADD CONSTRAINT fk_ai_records_calf_id 
FOREIGN KEY (calf_id) REFERENCES calves(id) ON DELETE SET NULL;

ALTER TABLE vaccination_records 
ADD CONSTRAINT fk_vaccination_records_cow_id 
FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE CASCADE;

ALTER TABLE vaccination_records 
ADD CONSTRAINT fk_vaccination_records_schedule_id 
FOREIGN KEY (vaccination_schedule_id) REFERENCES vaccination_schedules(id) ON DELETE SET NULL;

ALTER TABLE weight_logs 
ADD CONSTRAINT fk_weight_logs_cow_id 
FOREIGN KEY (cow_id) REFERENCES cows(id) ON DELETE CASCADE;

ALTER TABLE milk_collections 
ADD CONSTRAINT fk_milk_collections_farmer_id 
FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE;

-- Add indexes for better query performance
CREATE INDEX idx_ai_records_cow_id ON ai_records(cow_id);
CREATE INDEX idx_ai_records_ai_date ON ai_records(ai_date);
CREATE INDEX idx_vaccination_records_cow_id ON vaccination_records(cow_id);
CREATE INDEX idx_vaccination_records_next_due ON vaccination_records(next_due_date);
CREATE INDEX idx_weight_logs_cow_id ON weight_logs(cow_id);
CREATE INDEX idx_weight_logs_date ON weight_logs(log_date);
CREATE INDEX idx_milk_collections_farmer_id ON milk_collections(farmer_id);
CREATE INDEX idx_milk_collections_date ON milk_collections(collection_date);
