-- Ensure value column is NUMERIC to support decimals (for sleep hours)
-- This is a safe migration that checks the current type first

DO $$
BEGIN
    -- Check if the column exists and is of type INTEGER
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'logs'
        AND column_name = 'value'
        AND data_type = 'integer'
    ) THEN
        -- Alter the column type to NUMERIC
        ALTER TABLE public.logs
        ALTER COLUMN value TYPE NUMERIC USING value::NUMERIC;
        
        RAISE NOTICE 'Column value changed from INTEGER to NUMERIC';
    ELSIF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'logs'
        AND column_name = 'value'
        AND data_type = 'numeric'
    ) THEN
        RAISE NOTICE 'Column value is already NUMERIC';
    ELSE
        RAISE NOTICE 'Column value does not exist or has unexpected type';
    END IF;
END
$$;

