# 本地批量还原 API（重建背景库）

## 解决什么问题

你有一批验证码样本，想自动重建背景库并马上用于识别，这个 API 就是干这个的。

## 调用示例

summary = sdk.run_local_restore_dict(
    input_dir="/path/to/captcha_samples",
    output_dir="/path/to/restored_backgrounds",
    clear_output_before_run=False,
    recursive=True,
    max_error_items=200,
)

## 核心流程

1. 扫描输入目录图片。
2. 按尺寸与相似性分桶。
3. 每桶执行像素投票重建背景。
4. 写出背景文件和 summary。
5. 自动刷新 SDK 内部背景索引。

## 关键输出字段

- status：completed / failed / stopped
- total_files：扫描总文件数
- image_files：图片文件数
- processed_files：已处理数
- succeeded_files：成功数
- failed_files：失败数
- skipped_files：跳过数
- bucket_count：桶数量
- completed_bucket_count：完成桶数量
- output_files：输出背景图数量
- summary_path：汇总文件路径
- buckets[]：每个桶明细
- errors[]：错误样本（最多 max_error_items 条）

## buckets[] 每项字段

- id：桶 ID
- width / height：桶尺寸
- image_count：桶内样本数
- output_file：输出文件名
- output_path：输出文件全路径
