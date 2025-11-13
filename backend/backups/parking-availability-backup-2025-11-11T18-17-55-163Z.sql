-- Parking Availability Backup
-- Created: 2025-11-11T18:17:55.169Z
-- Total parkings with availability: 2

CREATE TABLE IF NOT EXISTS parking_availability_backup (
  id INTEGER PRIMARY KEY,
  availability TEXT,
  updated_at TIMESTAMP,
  backup_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert statements
INSERT INTO parking_availability_backup (id, availability, updated_at) VALUES (1, '{"sunday":[0,4,8,12,16,20],"monday":[0,4,8,12,16,20],"tuesday":[0,4,8,12,16,20],"wednesday":[0,4,8,12,16,20],"thursday":[0,4,8,12,16,20],"friday":[0,4,8,12,16,20],"saturday":[0,4,8,12,16,20]}', CURRENT_TIMESTAMP);
INSERT INTO parking_availability_backup (id, availability, updated_at) VALUES (2, '{"sunday":[],"monday":[],"thursday":[12,15,18,21],"friday":[],"saturday":[],"wednesday":[],"tuesday":[]}', CURRENT_TIMESTAMP);