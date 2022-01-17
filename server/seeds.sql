DELETE FROM Customer;
DELETE FROM Item;

INSERT INTO Customer
  (name, country, zip)
VALUES
  ('Roxanna Newman', 'CA', 'N2J1R1'),
  ('Clive Bateson', 'US', '90001'),
  ('Mervin Mitchell', 'AU', '1001'),
  ('Erik Peters', 'DE', '10115'),
  ('Timothé Paul', 'FR', '75001');

INSERT INTO item
  (id, price)
VALUES
  (5, 102.55),
  (1254, 20.93),
  (30342, 50.00),
  (671, 2499.98),
  (59211, 410.10);
