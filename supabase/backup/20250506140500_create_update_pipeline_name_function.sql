-- Function to update the name of a pipeline
CREATE OR REPLACE FUNCTION public.update_pipeline_name(
    pipeline_id UUID,
    new_name TEXT
)
RETURNS SETOF public.pipelines -- Return the updated pipeline record
LANGUAGE plpgsql
SECURITY DEFINER -- Important for accessing auth.uid() and ensuring ownership
AS $$
BEGIN
    -- Check if the new name is empty or null
    IF new_name IS NULL OR trim(new_name) = '' THEN
        RAISE EXCEPTION 'Pipeline name cannot be empty.';
    END IF;

    -- Update the pipeline name only if the user owns it
    RETURN QUERY
    UPDATE public.pipelines
    SET name = trim(new_name) -- Trim whitespace
    WHERE id = pipeline_id AND user_id = auth.uid()
    RETURNING *; -- Return the updated row

    -- Check if the update affected any row (i.e., if the user owns the pipeline)
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pipeline not found or permission denied.';
    END IF;
END;
$$;

COMMENT ON FUNCTION public.update_pipeline_name(UUID, TEXT) IS 'Updates the name of a specific pipeline owned by the current user.';

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION public.update_pipeline_name(UUID, TEXT) TO authenticated;
