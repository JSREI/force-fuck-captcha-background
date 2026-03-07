# 本地还原 API

## 方法

- `run_local_restore_dict(`
    input_dir,
    output_dir,
    clear_output_before_run=False,
    recursive=True,
    max_error_items=200,
  )`

## 能力

- 扫描验证码目录并分桶（按 `group_id`）
- 每桶执行像素投票重建背景
- 输出背景图与 `summary.json`
- 完成后自动刷新 SDK 内部背景索引

## 输出重点字段

- `bucket_count`
- `output_files`
- `summary_path`
- `buckets[]`（每个桶的输出详情）
- `errors[]`（错误样本列表）
