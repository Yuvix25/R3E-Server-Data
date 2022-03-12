import socket
import signal
from timeit import default_timer as timer

port = 80

def signal_handler(signal, frame):
    """ Catch Ctrl-C and Exit """
    pass

# Register SIGINT Handler
signal.signal(signal.SIGINT, signal_handler)

def ping(host, port):
    success = False

    # New Socket
    s = socket.socket(
    socket.AF_INET, socket.SOCK_STREAM)

    # 1sec Timeout
    s.settimeout(1)

    # Start a timer
    s_start = timer()

    # Try to Connect
    try:
        s.connect((host, int(port)))
        s.shutdown(socket.SHUT_RD)
        success = True
    
    # Connection Timed Out
    except socket.timeout:
        print("Connection timed out!")
    except OSError as e:
        print("OS Error:", e)

    # Stop Timer
    s_stop = timer()
    s_runtime = "%.2f" % (1000 * (s_stop - s_start))

    if success:
        print("Connected to %s[%s]: time=%s ms" % (host, port, s_runtime))
        return s_runtime
    
    return -1

if __name__ == "__main__":
    ping("85.215.221.21", 60001)