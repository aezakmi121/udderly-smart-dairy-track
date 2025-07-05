
-- Create a function to get low stock feed items
CREATE OR REPLACE FUNCTION get_low_stock_items()
RETURNS TABLE(
  id uuid,
  name text,
  unit text,
  current_stock numeric,
  minimum_stock_level numeric,
  cost_per_unit numeric,
  category_id uuid,
  created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    fi.id,
    fi.name,
    fi.unit,
    fi.current_stock,
    fi.minimum_stock_level,
    fi.cost_per_unit,
    fi.category_id,
    fi.created_at
  FROM feed_items fi
  WHERE fi.current_stock IS NOT NULL 
    AND fi.minimum_stock_level IS NOT NULL
    AND fi.current_stock <= fi.minimum_stock_level
  ORDER BY fi.name;
$$;
