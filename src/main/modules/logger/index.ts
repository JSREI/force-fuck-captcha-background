import log from 'electron-log';
import * as path from 'path';
import { app } from 'electron';

// 配置日志文件路径
// 在不同平台上，日志文件默认保存在以下位置：
// on Linux: ~/.config/{app name}/logs/main.log
// on macOS: ~/Library/Logs/{app name}/main.log
// on Windows: %USERDATA%\{app name}\logs\main.log

class Logger {
    constructor() {
        // 设置日志文件的路径
        log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs/main.log');
        
        // 配置文件日志
        log.transports.file.level = 'info';        // 日志级别
        log.transports.file.maxSize = 1024 * 1024; // 1M，单个文件最大大小
        log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}'; // 日志格式
        
        // 配置控制台日志
        log.transports.console.level = 'debug';     // 控制台日志级别
        log.transports.console.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
    }

    // 不同级别的日志方法
    debug(message: string, ...args: any[]) {
        log.debug(message, ...args);
    }

    info(message: string, ...args: any[]) {
        log.info(message, ...args);
    }

    warn(message: string, ...args: any[]) {
        log.warn(message, ...args);
    }

    error(message: string, ...args: any[]) {
        log.error(message, ...args);
    }

    // 获取日志文件路径
    getLogFilePath(): string {
        return log.transports.file.getFile().path;
    }
}

// 导出单例
export const logger = new Logger(); 